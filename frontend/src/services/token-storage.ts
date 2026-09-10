const ACCESS = "dormitory_access_token";
export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS),
  set(accessToken: string) {
    localStorage.setItem(ACCESS, accessToken);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem("dormitory_refresh_token");
  },
};
