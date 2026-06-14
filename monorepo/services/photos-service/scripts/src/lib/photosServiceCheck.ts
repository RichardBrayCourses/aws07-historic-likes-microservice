export type PhotosServiceCheck = {
  name: string;
  path: string;
  method?: string;
  token?: string;
  expectedStatus: number;
};

export async function runPhotosServiceCheck(
  photosServiceBaseUrl: string,
  check: PhotosServiceCheck,
) {
  const headers: Record<string, string> = {};

  if (check.token) {
    headers.Authorization = check.token;
  }

  const response = await fetch(`${photosServiceBaseUrl}${check.path}`, {
    method: check.method ?? "GET",
    headers,
  });

  const passed = response.status === check.expectedStatus;

  return {
    ...check,
    actualStatus: response.status,
    passed,
  };
}
