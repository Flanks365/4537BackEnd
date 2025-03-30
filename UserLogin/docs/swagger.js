const options = {
    openapi: "OpenAPI 3",
    language: "en-US",
    disableLogs: false,
    autoHeaders: false,
    autoQuery: false,
    autoBody: false,
  };
  const generateSwagger = require("swagger-autogen")();
  
  const swaggerDocument = {
    info: {
      version: "1.0.0",
      title: "AI Quiz App API",
      description: "API for managing questions and answers for AI-powered classroom quizzes",
      contact: {
        name: "API Support",
        email: "mdoswell@my.bcit.ca",
      },
    },
    host: "https://octopus-app-x9uen.ondigitalocean.app",
    basePath: "/",
    schemes: ["http"],
    consumes: ["application/json"],
    produces: ["application/json"],
    tags: [
      {
        name: "AI QUIZ CRUD",
        description: "AI Quiz related API",
      },
      {
        name: "AI Quiz",
        description: "AI Quiz App",
      },
    ],
    securityDefinitions: {},
    definitions: {
      "errorResponse.400": {
        code: 400,
        message:
        "The request was malformed or invalid. Please check the request parameters.",
      },
      "errorResponse.401": {
        code: 401,
        message: "Authentication failed or user lacks proper authorization.",
      },
      "errorResponse.403": {
        code: 403,
        message: "You do not have permission to access this resource.",
      },
      "errorResponse.404": {
        code: "404",
        message: "The requested resource could not be found on the server.",
      },
      "errorResponse.500": {
        code: 500,
        message:
        "An unexpected error occurred on the server. Please try again later.",
      },
    },
  };
  const swaggerFile= "./docs/swagger.json";
  const apiRouteFile= ["./Main.js"];
  generateSwagger(swaggerFile, apiRouteFile, swaggerDocument);