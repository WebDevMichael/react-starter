const express = require('express');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpack = require('webpack');
const path = require('path');
const httpProxy = require('http-proxy');
const cookie = require('react-cookie');

const webpackConfig = require('../webpack.config.js');
const config = require('./config');

const app = express();
const compiler = webpack(webpackConfig);
const targetUrl = `http://${config.apiHost}:${config.apiPort}/api`;

const proxy = httpProxy.createProxyServer({
  target: targetUrl,
  changeOrigin: true
});

app.use(express.static(`${__dirname}/www`));

app.use(webpackDevMiddleware(compiler, {
  hot: true,
  filename: 'bundle.js',
  publicPath: '/',
  stats: {
    colors: true,
  },
  historyApiFallback: true,
}));

// Proxy to API server
app.use('/api', (req, res) => {
  cookie.plugToRequest(req, res);
  proxy.web(req, res, { target: targetUrl });
});

// added the error handling to avoid https://github.com/nodejitsu/node-http-proxy/issues/527
proxy.on('error', (error, req, res) => {
  if (error.code !== 'ECONNRESET') {
    console.error('proxy error', error);
  }
  if (!res.headersSent) {
    res.writeHead(500, { 'content-type': 'application/json' });
  }

  const json = { error: 'proxy_error', reason: error.message };
  res.end(JSON.stringify(json));
});

const server = app.listen(3000, () => {
  const host = server.address().address;
  const port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});

// handle every other route with index.html, which will contain
// a script tag to your application's JavaScript file(s).
app.get('*', (request, response) => {
  response.sendFile(path.resolve(__dirname, '../www', 'index.html'));
});
