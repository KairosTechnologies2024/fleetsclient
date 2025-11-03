import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { useAuthState, useSignOut } from "react-firebase-hooks/auth";
import { auth, db } from "lib/firebase";
import { useEffect, useState } from "react";
import { DASHBOARD, LOGIN, MANAGER } from "lib/routes";
import { useToast } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { setDoc, doc} from "firebase/firestore";
import { checkUserRole } from "Functions/CheckUserRole";

export function useAuth() {
  const [authUser, authLoading, error] = useAuthState(auth);
  const [isLoading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const toast = useToast();

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const result = await checkUserRole(authUser.uid);

      if (result) {
        setUser(result.data);
      } else {
        toast({
          title: "User not found",
          description: "User does not exist in any recognized user collection.",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      }

      setLoading(false);
    }

    if (!authLoading) {
      if (authUser) fetchData();
      else setLoading(false);
    }
  }, [authLoading]);

  return { user, isLoading, error };
}

export function useLogin() {
  const [isLoading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  async function login({ email, password, redirectTo = DASHBOARD }) {
    setLoading(true);

    try {
      await auth.signOut(); // Reset session

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user) {
        throw new Error("User authentication failed.");
      }

      console.log("Logged in User ID:", user.uid);

      const { role, isAdmin } = await checkUserRole(user.uid);

      if (role === "fleetControllers" || role === "customers") {
        navigate(isAdmin ? MANAGER : DASHBOARD);
      } else if (role === "fleetCustomers") {
        navigate(DASHBOARD);
      }

    } catch (error) {
      console.error("Login Error:", error.message);

      let userMessage = "An unexpected error occurred.";
      if (error.message.includes("not approved")) {
        userMessage = "Your company account hasn’t been approved yet.";
      } else if (error.message.includes("not active")) {
        userMessage = "Your fleet controller account is not active.";
      } else if (error.message.includes("not found")) {
        userMessage = "No Account found for this account.";
      } else {
        userMessage = "User name or Password is incorrect";
      }

      toast({
        title: "Login failed",
        description: userMessage,
        status: "error",
        isClosable: true,
        position: "top",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }

  return { login, isLoading };
}


export function useRegister() {
  const [isLoading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();

  async function register({
    username,
    email,
    password,
    redirectTo = DASHBOARD,
  }) {
    setLoading(true);

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);

      await setDoc(doc(db, "users", res.user.uid), {
        id: res.user.uid,
        username: username.toLowerCase(),
        avatar: "",
        date: Date.now(),
      });

      toast({
        title: "Account created",
        description: "You are logged in",
        status: "success",
        isClosable: true,
        position: "top",
        duration: 5000,
      });

      navigate(redirectTo);
    } catch (error) {
      toast({
        title: "Signing Up failed",
        description: error.message,
        status: "error",
        isClosable: true,
        position: "top",
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  }

  return { register, isLoading };
}

export function useLogout() {
  const [signOut, isLoading] = useSignOut(auth);
  const toast = useToast();
  const navigate = useNavigate();

  async function logout() {
    if (await signOut()) {
      toast({
        title: "Successfully logged out",
        status: "success",
        isClosable: true,
        position: "top",
        duration: 5000,
      });
      navigate(LOGIN);
    }
  }

  return { logout, isLoading };
}