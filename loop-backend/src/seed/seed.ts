import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/password';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Starting database seeding...');

  // Clear existing data (optional - comment out if you want to keep existing data)
  logger.info('🧹 Cleaning existing data...');
  // Delete in order to respect foreign key constraints
  await prisma.videoLike.deleteMany();
  await prisma.videoSave.deleteMany();
  await prisma.commentLike.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.videoHashtag.deleteMany();
  await prisma.videoSound.deleteMany();
  await prisma.videoRelation.deleteMany();
  await prisma.watchHistory.deleteMany();
  await prisma.videoAnalytics.deleteMany();
  await prisma.message.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.block.deleteMany();
  await prisma.soundFavorite.deleteMany();
  await prisma.report.deleteMany();
  await prisma.userAnalytics.deleteMany();
  await prisma.userPrivacySettings.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.oAuthProvider.deleteMany();
  await prisma.video.deleteMany();
  await prisma.sound.deleteMany();
  await prisma.hashtag.deleteMany();
  await prisma.user.deleteMany();

  logger.info('✅ Database cleaned');

  // Create users
  logger.info('👥 Creating users...');
  const passwordHash = await hashPassword('password123');

  const users = await Promise.all([
    // Demo user for quick testing
    prisma.user.create({
      data: {
        email: 'demo@loop.com',
        username: 'demo_user',
        passwordHash,
        fullName: 'Demo User',
        bio: 'Demo account for testing 🎭',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
        isVerified: false,
      },
    }),
    prisma.user.create({
      data: {
        email: 'alice@example.com',
        username: 'alice',
        passwordHash,
        fullName: 'Alice Johnson',
        bio: 'Content creator and video enthusiast 🎬',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'bob@example.com',
        username: 'bob',
        passwordHash,
        fullName: 'Bob Smith',
        bio: 'Love making funny videos 😂',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
      },
    }),
    prisma.user.create({
      data: {
        email: 'charlie@example.com',
        username: 'charlie',
        passwordHash,
        fullName: 'Charlie Brown',
        bio: 'Tech reviewer and gadget lover 📱',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=charlie',
        isVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        email: 'diana@example.com',
        username: 'diana',
        passwordHash,
        fullName: 'Diana Prince',
        bio: 'Fitness coach 💪 | Healthy lifestyle',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=diana',
      },
    }),
    prisma.user.create({
      data: {
        email: 'eve@example.com',
        username: 'eve',
        passwordHash,
        fullName: 'Eve Wilson',
        bio: 'Travel vlogger ✈️ | Exploring the world',
        avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=eve',
      },
    }),
  ]);

  logger.info(`✅ Created ${users.length} users`);

  // Create privacy settings for users
  await Promise.all(
    users.map((user) =>
      prisma.userPrivacySettings.create({
        data: {
          userId: user.id,
          profileVisibility: 'public',
          allowMessages: 'everyone',
          allowComments: true,
          allowDuet: true,
          allowStitch: true,
          showActivityStatus: true,
        },
      })
    )
  );

  // Create follows
  logger.info('👥 Creating follows...');
  await prisma.follow.create({
    data: {
      followerId: users[1].id, // bob follows alice
      followingId: users[0].id,
    },
  });
  await prisma.follow.create({
    data: {
      followerId: users[2].id, // charlie follows alice
      followingId: users[0].id,
    },
  });
  await prisma.follow.create({
    data: {
      followerId: users[3].id, // diana follows alice
      followingId: users[0].id,
    },
  });
  await prisma.follow.create({
    data: {
      followerId: users[0].id, // alice follows bob
      followingId: users[1].id,
    },
  });
  logger.info('✅ Created follows');

  // Create hashtags
  logger.info('🏷️  Creating hashtags...');
  const hashtags = await Promise.all([
    prisma.hashtag.create({
      data: {
        tag: 'fyp',
        views: BigInt(1000000),
        videosCount: 500,
      },
    }),
    prisma.hashtag.create({
      data: {
        tag: 'viral',
        views: BigInt(500000),
        videosCount: 250,
      },
    }),
    prisma.hashtag.create({
      data: {
        tag: 'comedy',
        views: BigInt(300000),
        videosCount: 150,
      },
    }),
    prisma.hashtag.create({
      data: {
        tag: 'dance',
        views: BigInt(200000),
        videosCount: 100,
      },
    }),
    prisma.hashtag.create({
      data: {
        tag: 'cooking',
        views: BigInt(150000),
        videosCount: 75,
      },
    }),
    prisma.hashtag.create({
      data: {
        tag: 'adventure',
        views: BigInt(180000),
        videosCount: 90,
      },
    }),
    prisma.hashtag.create({
      data: {
        tag: 'travel',
        views: BigInt(120000),
        videosCount: 60,
      },
    }),
    prisma.hashtag.create({
      data: {
        tag: 'art',
        views: BigInt(95000),
        videosCount: 48,
      },
    }),
    prisma.hashtag.create({
      data: {
        tag: 'scifi',
        views: BigInt(80000),
        videosCount: 40,
      },
    }),
  ]);
  logger.info(`✅ Created ${hashtags.length} hashtags`);

  // Create videos (using free sample videos from public CDNs)
  logger.info('🎬 Creating videos...');
  const videos = await Promise.all([
    prisma.video.create({
      data: {
        userId: users[0].id, // alice
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg',
        title: 'My First Video!',
        description: 'This is my first video on Loop! Hope you like it 🎉',
        views: BigInt(15000),
        likesCount: 1200,
        commentsCount: 45,
        sharesCount: 30,
        duration: 596,
        fileSize: BigInt(5000000),
        privacy: 'public',
        status: 'ready',
        videoHashtags: {
          create: [
            { hashtag: 'fyp' },
            { hashtag: 'viral' },
          ],
        },
      },
    }),
    prisma.video.create({
      data: {
        userId: users[1].id, // bob
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ElephantsDream.jpg',
        title: 'Funny Moment 😂',
        description: 'Had to share this!',
        views: BigInt(8500),
        likesCount: 650,
        commentsCount: 20,
        sharesCount: 15,
        duration: 653,
        fileSize: BigInt(2500000),
        privacy: 'public',
        status: 'ready',
        videoHashtags: {
          create: [
            { hashtag: 'comedy' },
            { hashtag: 'fyp' },
          ],
        },
      },
    }),
    prisma.video.create({
      data: {
        userId: users[0].id, // alice
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerBlazes.jpg',
        title: 'Cooking Tutorial',
        description: 'Learn how to make this delicious dish!',
        views: BigInt(12000),
        likesCount: 980,
        commentsCount: 35,
        sharesCount: 25,
        duration: 15,
        fileSize: BigInt(15000000),
        privacy: 'public',
        status: 'ready',
        videoHashtags: {
          create: [
            { hashtag: 'cooking' },
            { hashtag: 'fyp' },
          ],
        },
      },
    }),
    prisma.video.create({
      data: {
        userId: users[2].id, // charlie
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
        thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerEscapes.jpg',
        title: 'Tech Review: New Phone',
        description: 'My honest review of the latest smartphone',
        views: BigInt(5000),
        likesCount: 420,
        commentsCount: 15,
        sharesCount: 10,
        duration: 15,
        fileSize: BigInt(20000000),
        privacy: 'public',
        status: 'ready',
        videoHashtags: {
          create: [
            { hashtag: 'viral' },
          ],
        },
      },
    }),
    prisma.video.create({
      data: {
        userId: users[3].id, // diana
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
        thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerFun.jpg',
        title: 'Morning Workout Routine',
        description: 'Start your day right! 💪',
        views: BigInt(3000),
        likesCount: 250,
        commentsCount: 12,
        sharesCount: 8,
        duration: 60,
        fileSize: BigInt(8000000),
        privacy: 'public',
        status: 'ready',
        videoHashtags: {
          create: [
            { hashtag: 'dance' },
          ],
        },
      },
    }),
    prisma.video.create({
      data: {
        userId: users[0].id, // alice
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4',
        thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerJoyrides.jpg',
        title: 'Amazing Adventure!',
        description: 'Check out this incredible journey 🚀',
        views: BigInt(22000),
        likesCount: 1800,
        commentsCount: 78,
        sharesCount: 45,
        duration: 15,
        fileSize: BigInt(12000000),
        privacy: 'public',
        status: 'ready',
        videoHashtags: {
          create: [
            { hashtag: 'fyp' },
            { hashtag: 'viral' },
            { hashtag: 'adventure' },
          ],
        },
      },
    }),
    prisma.video.create({
      data: {
        userId: users[1].id, // bob
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
        thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/ForBiggerMeltdowns.jpg',
        title: 'Epic Fail Compilation',
        description: 'You won\'t believe what happened! 😅',
        views: BigInt(18000),
        likesCount: 1450,
        commentsCount: 92,
        sharesCount: 67,
        duration: 15,
        fileSize: BigInt(9000000),
        privacy: 'public',
        status: 'ready',
        videoHashtags: {
          create: [
            { hashtag: 'comedy' },
            { hashtag: 'fyp' },
          ],
        },
      },
    }),
    prisma.video.create({
      data: {
        userId: users[2].id, // charlie
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/Sintel.jpg',
        title: 'Short Film: Sintel',
        description: 'Beautiful animated short film',
        views: BigInt(9500),
        likesCount: 720,
        commentsCount: 38,
        sharesCount: 22,
        duration: 888,
        fileSize: BigInt(18000000),
        privacy: 'public',
        status: 'ready',
        videoHashtags: {
          create: [
            { hashtag: 'viral' },
            { hashtag: 'art' },
          ],
        },
      },
    }),
    prisma.video.create({
      data: {
        userId: users[3].id, // diana
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
        thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/SubaruOutbackOnStreetAndDirt.jpg',
        title: 'Road Trip Vlog',
        description: 'Exploring new places 🌍',
        views: BigInt(6500),
        likesCount: 520,
        commentsCount: 28,
        sharesCount: 18,
        duration: 15,
        fileSize: BigInt(11000000),
        privacy: 'public',
        status: 'ready',
        videoHashtags: {
          create: [
            { hashtag: 'travel' },
            { hashtag: 'fyp' },
          ],
        },
      },
    }),
    prisma.video.create({
      data: {
        userId: users[0].id, // alice
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        thumbnailUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/TearsOfSteel.jpg',
        title: 'Sci-Fi Short: Tears of Steel',
        description: 'Amazing visual effects!',
        views: BigInt(11000),
        likesCount: 890,
        commentsCount: 42,
        sharesCount: 29,
        duration: 734,
        fileSize: BigInt(16000000),
        privacy: 'public',
        status: 'ready',
        videoHashtags: {
          create: [
            { hashtag: 'viral' },
            { hashtag: 'scifi' },
          ],
        },
      },
    }),
  ]);
  logger.info(`✅ Created ${videos.length} videos`);

  // Create video likes
  logger.info('❤️  Creating video likes...');
  await Promise.all([
    prisma.videoLike.create({
      data: {
        userId: users[1].id,
        videoId: videos[0].id,
      },
    }),
    prisma.videoLike.create({
      data: {
        userId: users[2].id,
        videoId: videos[0].id,
      },
    }),
    prisma.videoLike.create({
      data: {
        userId: users[0].id,
        videoId: videos[1].id,
      },
    }),
    prisma.videoLike.create({
      data: {
        userId: users[3].id,
        videoId: videos[0].id,
      },
    }),
  ]);
  logger.info('✅ Created video likes');

  // Create comments
  logger.info('💬 Creating comments...');
  const comments = await Promise.all([
    prisma.comment.create({
      data: {
        videoId: videos[0].id,
        userId: users[1].id,
        text: 'Great video! Love it! 🔥',
        likesCount: 5,
      },
    }),
    prisma.comment.create({
      data: {
        videoId: videos[0].id,
        userId: users[2].id,
        text: 'Amazing content! Keep it up!',
        likesCount: 3,
      },
    }),
    prisma.comment.create({
      data: {
        videoId: videos[1].id,
        userId: users[0].id,
        text: 'So funny! 😂',
        likesCount: 2,
      },
    }),
  ]);
  logger.info(`✅ Created ${comments.length} comments`);

  // Create notifications
  logger.info('🔔 Creating notifications...');
  await Promise.all([
    prisma.notification.create({
      data: {
        userId: users[0].id,
        type: 'like',
        actorId: users[1].id,
        videoId: videos[0].id,
        message: 'bob liked your video',
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[0].id,
        type: 'comment',
        actorId: users[1].id,
        videoId: videos[0].id,
        commentId: comments[0].id,
        message: 'bob commented on your video',
        read: false,
      },
    }),
    prisma.notification.create({
      data: {
        userId: users[0].id,
        type: 'follow',
        actorId: users[1].id,
        message: 'bob started following you',
        read: true,
      },
    }),
  ]);
  logger.info('✅ Created notifications');

  // Create sounds
  logger.info('🎵 Creating sounds...');
  const sounds = await Promise.all([
    prisma.sound.create({
      data: {
        userId: users[0].id,
        title: 'Trending Beat',
        artist: 'Unknown Artist',
        duration: 30,
        url: 'https://example.com/sounds/sound1.mp3',
        thumbnailUrl: 'https://picsum.photos/300/300?random=sound1',
        genre: 'Hip Hop',
        tags: ['trending', 'beat', 'hiphop'],
        totalVideos: 50,
        totalViews: BigInt(100000),
        totalLikes: 5000,
        isOriginal: false,
      },
    }),
    prisma.sound.create({
      data: {
        userId: users[1].id,
        title: 'Chill Vibes',
        artist: 'Chill Artist',
        duration: 60,
        url: 'https://example.com/sounds/sound2.mp3',
        thumbnailUrl: 'https://picsum.photos/300/300?random=sound2',
        genre: 'Chill',
        tags: ['chill', 'relaxing'],
        totalVideos: 25,
        totalViews: BigInt(50000),
        totalLikes: 2500,
        isOriginal: true,
      },
    }),
  ]);
  logger.info(`✅ Created ${sounds.length} sounds`);

  logger.info('🎉 Seeding completed successfully!');
  logger.info('\n📝 Test accounts created:');
  logger.info('   🎭 DEMO: Email: demo@loop.com | Password: password123');
  logger.info('   Email: alice@example.com | Password: password123');
  logger.info('   Email: bob@example.com | Password: password123');
  logger.info('   Email: charlie@example.com | Password: password123');
  logger.info('   Email: diana@example.com | Password: password123');
  logger.info('   Email: eve@example.com | Password: password123');
}

main()
  .catch((e) => {
    logger.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

