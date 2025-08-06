import {
  Box,
  Button,
  Center,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Input,
  Link,
  Text,
  useToast,
} from "@chakra-ui/react";
import { useLogin } from "hooks/auth";
import { useForm } from "react-hook-form";
import { emailValidate, passwordValidate } from "utils/form-validate";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "lib/firebase";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { handleLogin } from "Functions/loginFunction";


export default function Login() {
  const { login, isLoading, error } = useLogin();
  const [resetEmail, setResetEmail] = useState("");
  const toast = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const navigate = useNavigate();
  const register_link = "http://ekco-tracking.co.za:3006/"

  async function handleForgotPassword() {
    if (!resetEmail) {
      toast({
        title: "Error",
        description: "Please enter your email to reset password.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({
        title: "Success",
        description: "Password reset email sent! Check your inbox.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  }

  return (
    <Center w="100%" h="100vh">
      <Box mx="1" maxW="md" p="9" borderWidth="1px" borderRadius="lg">
        <Heading mb="4" size="lg" textAlign="center">
          FLEETS PAGE
        </Heading>
        <Heading mb="4" size="lg" textAlign="center">
          Log In
        </Heading>

        <form onSubmit={handleSubmit((data) => handleLogin(data, login, navigate, toast))}>
          <FormControl isInvalid={errors.email} py="2">
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              placeholder="user@email.com"
              {...register("email", emailValidate)}
              onChange={(e) => setResetEmail(e.target.value)}
              aria-label="Email Address"
              autoFocus
            />
            <FormErrorMessage>
              {errors.email && errors.email.message}
            </FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={errors.password} py="2">
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              placeholder="Enter Password"
              {...register("password", passwordValidate)}
              aria-label="Password"
            />
            <FormErrorMessage>
              {errors.password && errors.password.message}
            </FormErrorMessage>
          </FormControl>

          <Text
            color="teal.800"
            textAlign="center"
            fontSize="sm"
            mt="2"
            cursor="pointer"
            _hover={{ textDecoration: "underline" }}
            onClick={handleForgotPassword}
          >
            Forgot Password?
          </Text>

          <Text mt="4" fontSize="sm" textAlign="center">
            Don’t have an account?{" "}
            <Link
              color="teal.500"
              href={register_link}
              isExternal
              _hover={{ textDecoration: "underline" }}
            >
              Register here
            </Link>
          </Text>

          {error && (
            <Text color="red.500" mt="2" textAlign="center">
              {error}
            </Text>
          )}

          <Button
            mt="4"
            type="submit"
            colorScheme="teal"
            size="md"
            w="full"
            isLoading={isLoading}
            loadingText="Logging In"
          >
            Log In
          </Button>
        </form>


      </Box>
    </Center>
  );
}
