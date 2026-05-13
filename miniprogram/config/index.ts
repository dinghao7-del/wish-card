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
      // static 目录包含大量图片（4.8MB），已迁移到 Supabase Storage，不再复制
      // { from: 'static', to: 'dist/static' },
      { from: 'static/skins', to: 'dist/static/skins' },
      // 仅复制 icons 目录（tabBar 需要），其他图片走 Supabase Storage 云端
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
