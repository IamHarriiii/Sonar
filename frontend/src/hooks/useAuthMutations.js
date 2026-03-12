import { useMutation } from "@tanstack/react-query";
import { authApi } from "../services/api";
import useAuthStore from "../stores/useAuthStore";

/**
 * TanStack Query mutation for login.
 */
export function useLoginMutation() {
  return useMutation({
    mutationFn: ({ username, password }) => authApi.login(username, password),
    onSuccess: (data) => {
      localStorage.setItem("sonar_access_token", data.access_token);
      localStorage.setItem("sonar_refresh_token", data.refresh_token);
      localStorage.setItem("sonar_user", JSON.stringify(data.user));
      useAuthStore.setState({
        user: data.user,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
    },
  });
}

/**
 * TanStack Query mutation for signup.
 */
export function useSignupMutation() {
  return useMutation({
    mutationFn: ({ username, password }) => authApi.signup(username, password),
    onSuccess: (data) => {
      localStorage.setItem("sonar_access_token", data.access_token);
      localStorage.setItem("sonar_refresh_token", data.refresh_token);
      localStorage.setItem("sonar_user", JSON.stringify(data.user));
      useAuthStore.setState({
        user: data.user,
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      });
    },
  });
}
