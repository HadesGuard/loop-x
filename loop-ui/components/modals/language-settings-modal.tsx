"use client"

import { X, Globe, Check } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"

interface LanguageSettingsData {
  appLanguage: string
  contentLanguage: string[]
  autoTranslate: boolean
}

interface LanguageSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  languageData: LanguageSettingsData
  onLanguageDataChange: (data: LanguageSettingsData) => void
  onSave: () => void
}

const languages = [
  { code: "en", name: "English", nativeName: "English" },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
  { code: "es", name: "Spanish", nativeName: "Español" },
  { code: "fr", name: "French", nativeName: "Français" },
  { code: "de", name: "German", nativeName: "Deutsch" },
  { code: "ja", name: "Japanese", nativeName: "日本語" },
  { code: "ko", name: "Korean", nativeName: "한국어" },
  { code: "zh", name: "Chinese", nativeName: "中文" },
  { code: "pt", name: "Portuguese", nativeName: "Português" },
  { code: "it", name: "Italian", nativeName: "Italiano" },
  { code: "ru", name: "Russian", nativeName: "Русский" },
  { code: "ar", name: "Arabic", nativeName: "العربية" },
]

export function LanguageSettingsModal({
  isOpen,
  onClose,
  languageData,
  onLanguageDataChange,
  onSave,
}: LanguageSettingsModalProps) {
  if (!isOpen) return null

  const handleSave = () => {
    onSave()
    toast.success("Language settings saved", {
      description: "Your language preferences have been updated",
    })
  }

  const toggleContentLanguage = (langCode: string) => {
    const newContentLanguages = languageData.contentLanguage.includes(langCode)
      ? languageData.contentLanguage.filter((code) => code !== langCode)
      : [...languageData.contentLanguage, langCode]
    onLanguageDataChange({ ...languageData, contentLanguage: newContentLanguages })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-neutral-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-neutral-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-white" />
            <h2 className="text-xl font-semibold text-white">Language Settings</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* App Language */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">App Language</h3>
            <p className="text-sm text-white/60">Choose the language for the app interface</p>
            <div className="space-y-2">
              {languages.map((lang) => (
                <label
                  key={lang.code}
                  className="flex items-center gap-3 p-4 bg-neutral-800/50 rounded-lg cursor-pointer hover:bg-neutral-800 transition-colors"
                >
                  <input
                    type="radio"
                    name="appLanguage"
                    value={lang.code}
                    checked={languageData.appLanguage === lang.code}
                    onChange={(e) => onLanguageDataChange({ ...languageData, appLanguage: e.target.value })}
                    className="w-4 h-4 text-blue-500 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">{lang.nativeName}</div>
                    <div className="text-sm text-white/60">{lang.name}</div>
                  </div>
                  {languageData.appLanguage === lang.code && (
                    <Check className="w-5 h-5 text-blue-500" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Content Languages */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-white">Content Languages</h3>
            <p className="text-sm text-white/60">Select languages for videos you want to see</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {languages.map((lang) => (
                <label
                  key={lang.code}
                  className="flex items-center gap-3 p-4 bg-neutral-800/50 rounded-lg cursor-pointer hover:bg-neutral-800 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={languageData.contentLanguage.includes(lang.code)}
                    onChange={() => toggleContentLanguage(lang.code)}
                    className="w-4 h-4 text-blue-500 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="text-white font-medium">{lang.nativeName}</div>
                    <div className="text-sm text-white/60">{lang.name}</div>
                  </div>
                  {languageData.contentLanguage.includes(lang.code) && (
                    <Check className="w-5 h-5 text-blue-500" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Auto Translate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-lg">
              <div>
                <div className="text-white font-medium">Auto-translate Comments</div>
                <div className="text-sm text-white/60">Automatically translate comments to your app language</div>
              </div>
              <Switch
                checked={languageData.autoTranslate}
                onCheckedChange={(checked) => onLanguageDataChange({ ...languageData, autoTranslate: checked })}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-neutral-900 border-t border-white/10 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg text-white font-medium transition-all"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

