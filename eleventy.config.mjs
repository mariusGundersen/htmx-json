/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function (eleventyConfig) {
  // Configure Eleventy
  eleventyConfig.setInputDirectory("./docs");
  eleventyConfig.addPassthroughCopy("./src/htmx-json.js")
}
