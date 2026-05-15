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
      // 小程序游客/离线模式必须使用本地素材，避免头像、任务、心愿图片走云端造成 400/500。
      { from: 'assets', to: 'dist/assets' },
    ],
    options: {},
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: {
    enable: false,
  },
  mini: {
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
