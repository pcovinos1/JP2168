export const beforePublishedUpdate = "jp2168:before-published-update";

export function canApplyPublishedUpdate(): boolean {
  return window.dispatchEvent(new Event(beforePublishedUpdate, { cancelable: true }));
}
