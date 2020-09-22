const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = [{
	entry: './src/ts/app/App.ts',
	output: {
		filename: './js/main.[contenthash].js',
		path: path.resolve(__dirname, 'build')
	},
	devtool: 'inline-source-map',
	plugins: [
		new CleanWebpackPlugin(),
		new HtmlWebpackPlugin({
			filename: 'index.html',
			template: './src/index.html',
			minify: false
		}),
		new MiniCssExtractPlugin({
			filename: 'style.[contenthash].css'
		}),
		new CopyPlugin({
			patterns: [
				//{from: './src/resources/textures', to: path.resolve(__dirname, 'build/textures')},
				//{from: './src/resources/models', to: path.resolve(__dirname, 'build/models')},
				{from: './src/resources/images', to: path.resolve(__dirname, 'build/images')}
			]
		})
	],
	module: {
		rules: [
			{
				test: /\.vert|.frag|.glsl|.json$/i,
				use: [
					{
						loader: 'raw-loader',
						options: {
							esModule: false,
						},
					},
				]
			},
			{
				test: /\.css$/i,
				use: [MiniCssExtractPlugin.loader, 'css-loader']
			},
			{
				test: /\.worker\.ts$/,
				use: {loader: 'worker-loader'}
			},
			{
				test: /\.ts$/,
				loader: [
					{loader: 'ts-loader', options: {configFile: 'tsconfig.json'}}
				],
				exclude: /node_modules/
			}
		]
	},
	resolve: {
		extensions: ['.ts', '.js']
	}
}];