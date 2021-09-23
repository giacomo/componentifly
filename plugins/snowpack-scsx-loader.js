const sass = require('sass');

module.exports = function (snowpackConfig, pluginOptions) {
  return {
    name: 'snowpack-scsx-loader',
    resolve: {
      input: ['.scsx'],
      output: ['.js'],
    },
    async load({ filePath }) {

      const result = sass.renderSync({
        file: filePath,
        includePaths: ["node_modules"],
        importer: function(url, prev, done) {
          if (url[0] === '~') {
              url = url.substr(1);
          }
          return { file: url };
        }
      });
      return `export default ${JSON.stringify(result.css.toString())}`;
    }

  };
}