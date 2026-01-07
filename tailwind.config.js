module.exports = {
  content: ["./src/**/*.njk", "./src/**/*.md", "./src/**/*.js"],
  theme: {
    extend: {},
  },
  plugins: [require("@tailwindcss/forms")],
};