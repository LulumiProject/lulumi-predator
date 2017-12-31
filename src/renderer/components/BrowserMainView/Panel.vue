<template lang="pug">
  #browser-panel(@contextmenu.prevent="$parent.onNavbarContextMenu")
    div(v-for="extension in extensions",
        :key="extension.extensionId")
      webview.extension(v-show="extension.show",
                        :src="buildPanelPath(extension)",
                        :ref="`webview-${extension.extensionId}`")
</template>

<script lang="ts">
  import { Component, Vue } from 'vue-property-decorator';

  import * as url from 'url';

  @Component({
    props: [
      'windowId',
    ],
  })
  export default class Panel extends Vue {
    extensions: any[] = [];

    windowId: number;

    buildPanelPath(extension) {
      this.$nextTick(() => {
        const webview = this.$refs[`webview-${extension.extensionId}`][0];
        webview.addEventListener('ipc-message', (event: Electron.IpcMessageEvent) => {
          if (event.channel === 'resize') {
            const size = event.args[0];
            webview.style.height = `${size.height}px`;
            webview.style.width = `${size.width}px`;
            webview.style.overflow = 'hidden';
          } else if (event.channel === 'ready') {
            (this as any).$electron.ipcRenderer
              .send(`${extension.extensionId}-panel-id`, webview.getWebContents().id);
          }
        });
        webview.addEventListener('dom-ready', () => {
          webview.executeJavaScript(`
            ipcRenderer.sendToHost('ready');

            function triggerResize() {
              const height = document.body.clientHeight;
              const width = document.body.clientWidth;
              ipcRenderer.sendToHost('resize', {
                height,
                width,
              });
            }
            triggerResize();
            new ResizeSensor(document.body, triggerResize);
          `);
        });
      });
      return url.format({
        protocol: 'lulumi-extension',
        slashes: true,
        hostname: extension.extensionId,
        pathname: extension.panel,
      });
    }
  };
</script>

<style lang="less" scoped>
  #browser-panel {
    display: flex;
    flex-direction: column;
    height: auto;
    padding: 0 5px;
    border-bottom: 1px solid #888;
  }
</style>
