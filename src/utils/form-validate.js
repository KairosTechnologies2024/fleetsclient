export const textValidate = {
    required: {
      value: true,
      message: "This feild is required",
    },
    minLength: {
      value: 1,
      message: "This field must be more than 1 charecters long",
    },
    pattern: {
      value: /^[a-zA-Z]+$/,
      message: "Feild must only contain letters",
    },
  };
  
  export const emailValidate = {
    required: {
      value: true,
      message: "Please enter an email address",
    },
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: "Email address is not valid",
    },
  };
  
  export const passwordValidate = {
    required: {
      value: true,
      message: "Please enter password",
    },
    minLength: {
      value: 6,
      message: "Password must be at least 6 characters long",
    },
  };