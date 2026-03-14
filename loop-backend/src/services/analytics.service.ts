import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import { startOfDay, subDays, format } from 'date-fns';

export class AnalyticsService {
  /**
   * Get overall analytics for a user
   */
  async getOverview(userId: string) {
    // Get total stats from videos
    const videoStats = await prisma.video.aggregate({
      where: {
        userId,
        status: 'ready',
      },
      _sum: {
        views: true,
        likesCount: true,
        commentsCount: true,
        sharesCount: true,
      },
      _count: {
        id: true,
      },
    });

    // Get total followers
    const totalFollowers = await prisma.follow.count({
      where: { followingId: userId },
    });

    // Calculate total watch time from watch history
    const watchTimeData = await prisma.watchHistory.aggregate({
      where: {
        video: {
          userId,
        },
      },
      _sum: {
        watchedDuration: true,
      },
    });

    const totalWatchTime = watchTimeData._sum.watchedDuration || 0;
    const watchHours = totalWatchTime / 3600; // Convert seconds to hours

    // Calculate average engagement rate
    const totalViews = Number(videoStats._sum.views || 0);
    const totalLikes = videoStats._sum.likesCount || 0;
    const totalComments = videoStats._sum.commentsCount || 0;
    const totalShares = videoStats._sum.sharesCount || 0;
    const totalEngagements = totalLikes + totalComments + totalShares;

    const avgEngagement =
      totalViews > 0 ? ((totalEngagements / totalViews) * 100).toFixed(1) : 0;

    // Calculate weekly growth (simplified - compare last 7 days with previous 7 days)
    const now = new Date();
    const lastWeekStart = startOfDay(subDays(now, 7));
    const twoWeeksAgoStart = startOfDay(subDays(now, 14));

    const lastWeekViews = await this.getViewsInPeriod(userId, lastWeekStart, now);
    const previousWeekViews = await this.getViewsInPeriod(
      userId,
      twoWeeksAgoStart,
      lastWeekStart
    );

    const weeklyGrowth =
      previousWeekViews > 0
        ? (((lastWeekViews - previousWeekViews) / previousWeekViews) * 100).toFixed(1)
        : lastWeekViews > 0
          ? '100.0'
          : '0.0';

    return {
      totalViews: totalViews,
      totalFollowers,
      totalLikes,
      totalComments,
      totalShares,
      totalVideos: videoStats._count.id,
      avgEngagement: parseFloat(String(avgEngagement || 0)),
      weeklyGrowth: parseFloat(weeklyGrowth),
      watchHours: Math.round(watchHours * 100) / 100,
    };
  }

  /**
   * Get analytics for a specific video
   */
  async getVideoAnalytics(userId: string, videoId: string) {
    // Verify video exists and belongs to user
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        userId: true,
        views: true,
        likesCount: true,
        commentsCount: true,
        sharesCount: true,
        duration: true,
      },
    });

    if (!video) {
      throw new AppError('Video not found', 404, 'VIDEO_NOT_FOUND');
    }

    if (video.userId !== userId) {
      throw new AppError('Not authorized to view analytics for this video', 403, 'UNAUTHORIZED');
    }

    // Get watch time from watch history
    const watchTimeData = await prisma.watchHistory.aggregate({
      where: { videoId },
      _sum: {
        watchedDuration: true,
      },
      _count: {
        id: true,
      },
    });

    const totalWatchTime = watchTimeData._sum.watchedDuration || 0;
    const totalWatches = watchTimeData._count.id || 0;
    const avgWatchPercentage =
      video.duration && totalWatches > 0
        ? ((totalWatchTime / (video.duration * totalWatches)) * 100).toFixed(1)
        : 0;

    // Calculate engagement rate
    const totalViews = Number(video.views || 0);
    const totalEngagements = video.likesCount + video.commentsCount + video.sharesCount;
    const engagementRate =
      totalViews > 0 ? ((totalEngagements / totalViews) * 100).toFixed(1) : 0;

    // Get views by day (last 30 days)
    const viewsByDay = await this.getViewsByDay(videoId, 30);

    return {
      id: video.id,
      views: totalViews,
      likes: video.likesCount,
      comments: video.commentsCount,
      shares: video.sharesCount,
      watchTime: totalWatchTime,
      avgWatchPercentage: parseFloat(String(avgWatchPercentage || 0)),
      engagementRate: parseFloat(String(engagementRate || 0)),
      viewsByDay,
    };
  }

  /**
   * Track a view (called when video is watched)
   */
  async trackView(videoId: string, userId?: string, watchedDuration?: number) {
    try {
      // Increment video view count
      await prisma.video.update({
        where: { id: videoId },
        data: {
          views: {
            increment: 1,
          },
        },
      });

      // Update daily analytics
      const today = startOfDay(new Date());
      await prisma.videoAnalytics.upsert({
        where: {
          videoId_date: {
            videoId,
            date: today,
          },
        },
        update: {
          views: {
            increment: 1,
          },
        },
        create: {
          videoId,
          date: today,
          views: 1,
          likes: 0,
          comments: 0,
          shares: 0,
          watchTime: BigInt(0),
        },
      });

      // If user is logged in, add to watch history
      if (userId && watchedDuration !== undefined) {
        await prisma.watchHistory.upsert({
          where: {
            userId_videoId: {
              userId,
              videoId,
            },
          },
          update: {
            watchedDuration: watchedDuration,
            createdAt: new Date(), // Update timestamp on rewatch
          },
          create: {
            userId,
            videoId,
            watchedDuration: watchedDuration,
          },
        });

        // Update watch time in analytics
        const todayForWatch = startOfDay(new Date());
        await prisma.videoAnalytics.upsert({
          where: {
            videoId_date: {
              videoId,
              date: todayForWatch,
            },
          },
          update: {
            watchTime: {
              increment: BigInt(watchedDuration),
            },
          },
          create: {
            videoId,
            date: todayForWatch,
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            watchTime: BigInt(watchedDuration),
          },
        });
      }
    } catch (error) {
      logger.error('Error tracking view:', error);
      // Don't throw - view tracking is non-critical
    }
  }

  /**
   * Update analytics when interactions happen
   */
  async updateAnalytics(
    videoId: string,
    type: 'like' | 'comment' | 'share',
    increment: boolean = true
  ) {
    try {
      const today = startOfDay(new Date());
      const change = increment ? 1 : -1;

      const updateData: any = {};
      if (type === 'like') {
        updateData.likes = { increment: change };
      } else if (type === 'comment') {
        updateData.comments = { increment: change };
      } else if (type === 'share') {
        updateData.shares = { increment: change };
      }

      await prisma.videoAnalytics.upsert({
        where: {
          videoId_date: {
            videoId,
            date: today,
          },
        },
        update: updateData,
        create: {
          videoId,
          date: today,
          views: 0,
          likes: type === 'like' ? (increment ? 1 : 0) : 0,
          comments: type === 'comment' ? (increment ? 1 : 0) : 0,
          shares: type === 'share' ? (increment ? 1 : 0) : 0,
          watchTime: BigInt(0),
        },
      });
    } catch (error) {
      logger.error('Error updating analytics:', error);
      // Don't throw - analytics update is non-critical
    }
  }

  /**
   * Get views in a time period
   */
  private async getViewsInPeriod(userId: string, startDate: Date, endDate: Date): Promise<number> {
    const analytics = await prisma.videoAnalytics.findMany({
      where: {
        video: {
          userId,
        },
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      select: {
        views: true,
      },
    });

    return analytics.reduce((sum, a) => sum + a.views, 0);
  }

  /**
   * Get full creator dashboard data (overview + top videos)
   */
  async getCreatorDashboard(userId: string) {
    const overview = await this.getOverview(userId);

    // Get top 5 videos by views
    const topVideos = await prisma.video.findMany({
      where: { userId, status: 'ready' },
      orderBy: { views: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        views: true,
        likesCount: true,
        commentsCount: true,
        sharesCount: true,
        duration: true,
        createdAt: true,
      },
    });

    // Get views over last 30 days across all creator videos
    const startDate = startOfDay(subDays(new Date(), 30));
    const dailyAnalytics = await prisma.videoAnalytics.findMany({
      where: {
        video: { userId },
        date: { gte: startDate },
      },
      select: { date: true, views: true },
      orderBy: { date: 'asc' },
    });

    // Aggregate by date
    const viewsByDateMap = new Map<string, number>();
    for (const entry of dailyAnalytics) {
      const key = format(entry.date, 'yyyy-MM-dd');
      viewsByDateMap.set(key, (viewsByDateMap.get(key) || 0) + entry.views);
    }
    const viewsByDay = Array.from(viewsByDateMap.entries()).map(([date, views]) => ({ date, views }));

    return {
      ...overview,
      topVideos,
      viewsByDay,
    };
  }

  /**
   * Get views by day for a video
   */
  private async getViewsByDay(videoId: string, days: number = 30) {
    const startDate = startOfDay(subDays(new Date(), days));

    const analytics = await prisma.videoAnalytics.findMany({
      where: {
        videoId,
        date: {
          gte: startDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    return analytics.map((a) => ({
      date: format(a.date, 'yyyy-MM-dd'),
      views: a.views,
    }));
  }
}

export const analyticsService = new AnalyticsService();

