const fs = require('fs');

module.exports = function (snowpackConfig, pluginOptions) {

    return {
        name: 'snowpack-template-loader',
        resolve: {
            input: ['.template'],
            output: ['.js', '.template'],
        },
        async load({ filePath }) {
            const content = fs.readFileSync(filePath, 'utf-8');
            const proxied = content.replace(/\n/g, '\\n').replace(/"/g, '\\"');

            return {
                '.js': `export default \`${proxied}\`;`,
                '': content,
            }
        },
    }
}