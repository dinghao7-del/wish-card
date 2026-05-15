import type { Config } from '@tarojs/cli';
import path from 'path';

const config: Config = {
  projectName: 'forest-family-miniprogram',
  date: '2026-04-29',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  defineConstants: {},
  alias: {
    '@': path.resolve(__dirname, '..', 'src'),
  },
  copy: {
    patterns: [
      { from: 'static/skins', to: 'dist/static/skins' },
      // 首版发布包只保留必要 UI 图标和欢迎页皮肤。
      // 大批头像/任务/心愿模板图走对象存储，并在组件层回退到文字图标，避免小程序包体超限。
      { from: 'assets/icons', to: 'dist/assets/icons' },
    ],
    options: {},
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: {
    enable: false,
  },
  mini: {
    optimizeMainPackage: {
      enable: true,
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
        config: {},
      },
    },
    webpackChain: (chain) => {
      chain.merge({
        plugin: {
          install: {
            plugin: require('terser-webpack-plugin'),
            args: [
              {
                terserOptions: {
                  compress: true,
                  mangle: true,
                  sourceMap: false,
                  output: {
                    comments: true,
                  },
                },
              },
            ],
          },
        },
      });
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    webpackChain: (chain) => {
      chain.merge({
        plugin: {
          install: {
            plugin: require('terser-webpack-plugin'),
            args: [
              {
                terserOptions: {
                  compress: true,
                  mangle: true,
                  sourceMap: false,
                  output: {
                    comments: true,
                  },
                },
              },
            ],
          },
        },
      });
    },
    postcss: {
      autoprefixer: {
        enable: true,
      },
      cssModules: {
        enable: false,
        config: {},
      },
    },
  },
  rn: {
    appName: 'taroDemo',
    postcss: {
      cssModules: {
        enable: false,
      },
    },
  },
};

export default config;
