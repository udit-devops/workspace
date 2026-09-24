const tailwindcss = require("tailwindcss");
const autoprefixer = require("autoprefixer");
const tailwindcssNesting = require("@tailwindcss/nesting");

module.exports = {
  plugins: [tailwindcssNesting, tailwindcss, autoprefixer],
};
