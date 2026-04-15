interface ProfileChooserProps {
  profiles: string[];
  onSelect: (profile: string | null) => void;
  onCancel: () => void;
}

export function ProfileChooser({ profiles, onSelect, onCancel }: ProfileChooserProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-2">Multiple Profiles Detected</h3>
        <p className="text-sm text-gray-400 mb-5">
          The selected folder contains multiple game profiles. Choose which profile's runs to
          import, or import all of them.
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => onSelect(null)}
            className="w-full text-left px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium transition-colors"
          >
            All Profiles
            <span className="block text-xs text-gray-500 font-normal mt-0.5">
              Import runs from every profile folder
            </span>
          </button>

          {profiles.map((profile) => (
            <button
              key={profile}
              onClick={() => onSelect(profile)}
              className="w-full text-left px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium transition-colors"
            >
              {profile}
              <span className="block text-xs text-gray-500 font-normal mt-0.5">
                Import only runs from {profile}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="w-full mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
