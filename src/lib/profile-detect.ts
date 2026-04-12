const PROFILE_FOLDER_PATTERN = /^profile\d+$/i;

/**
 * Scan a file list for profile<#> folders in file paths.
 * Returns the sorted list of unique profile folder names found,
 * and whether the selected root folder itself is a profile folder.
 */
export function detectProfiles(files: FileList | File[]): {
  profiles: string[];
  rootIsProfile: boolean;
} {
  const profileSet = new Set<string>();
  let rootIsProfile = false;

  for (const file of Array.from(files)) {
    const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
    const segments = path.split('/');

    // segments[0] is the selected root folder
    if (segments.length >= 1 && PROFILE_FOLDER_PATTERN.test(segments[0])) {
      rootIsProfile = true;
    }

    for (const segment of segments) {
      if (PROFILE_FOLDER_PATTERN.test(segment)) {
        profileSet.add(segment.toLowerCase());
      }
    }
  }

  return {
    profiles: [...profileSet].sort(),
    rootIsProfile,
  };
}

/**
 * Filter files based on a selected profile.
 * - `null` means "all profiles" — return everything.
 * - A specific profile name filters to only files within that profile folder
 *   (plus any files not in any profile folder).
 */
export function filterFilesByProfile(
  files: FileList | File[],
  selectedProfile: string | null,
): File[] {
  const arr = Array.from(files);
  if (selectedProfile === null) return arr;

  return arr.filter((file) => {
    const path = (file as File & { webkitRelativePath?: string }).webkitRelativePath ?? '';
    const segments = path.split('/');

    for (const segment of segments) {
      if (PROFILE_FOLDER_PATTERN.test(segment)) {
        return segment.toLowerCase() === selectedProfile.toLowerCase();
      }
    }

    // File is not in any profile folder — always include
    return true;
  });
}
