/*!
 * Simple library to send files over WebRTC
 *
 * @author   Subin Siby <https://subinsb.com>
 * @license  MPL-2.0
 */

import PeerFileSend from './PeerFileSend';
import PeerFileReceive from './PeerFileReceive';
import SimplePeer from 'simple-peer';

export default class SimplePeerFiles {
  private arrivals: {
    [fileID: string]: PeerFileReceive;
  } = {};

  send(peer: SimplePeer.Instance, fileID: string, file: File) {
    return new Promise((resolve) => {
      const controlChannel = peer;

      let startingByte = 0;

      const fileChannel = new SimplePeer({
        initiator: true,
      });

      fileChannel.on('signal', (signal: SimplePeer.SignalData) => {
        controlChannel.send(
          JSON.stringify({
            fileID,
            signal,
          })
        );
      });

      let controlDataHandler = (data: string) => {
        try {
          const dataJSON = JSON.parse(data);

          if (
            dataJSON.signal &&
            dataJSON.fileID &&
            dataJSON.fileID === fileID
          ) {
            if (dataJSON.start) {
              startingByte = dataJSON.start;
            }

            fileChannel.signal(dataJSON.signal);
          }
        } catch (e) {}
      };

      fileChannel.on('connect', () => {
        let pfs: any = new PeerFileSend(fileChannel, file, startingByte);

        let destroyed = false;
        const destroy = () => {
          if (destroyed) return;

          controlChannel.removeListener('data', controlDataHandler);
          fileChannel.destroy();

          // garbage collect
          controlDataHandler = null;
          pfs = null;
          destroyed = true;
        };

        pfs.on('done', destroy);
        pfs.on('cancel', destroy);

        fileChannel.on('close', () => {
          if (typeof pfs?.cancel() == 'function') {
            pfs?.cancel();
          }
        });

        resolve(pfs);
      });

      controlChannel.on('data', controlDataHandler);
    });
  }

  receive(peer: SimplePeer.Instance, fileID: string) {
    return new Promise((resolve) => {
      const controlChannel = peer;

      const fileChannel = new SimplePeer({
        initiator: false,
      });

      fileChannel.on('signal', (signal: SimplePeer.SignalData) => {
        // chunk to start sending from
        let start = 0;

        // File resume capability
        if (fileID in this.arrivals) {
          start = this.arrivals[fileID].bytesReceived;
        }

        controlChannel.send(
          JSON.stringify({
            fileID,
            start,
            signal,
          })
        );
      });

      let controlDataHandler = (data: string) => {
        try {
          const dataJSON = JSON.parse(data);

          if (
            dataJSON.signal &&
            dataJSON.fileID &&
            dataJSON.fileID === fileID
          ) {
            fileChannel.signal(dataJSON.signal);
          }
        } catch (e) {}
      };

      fileChannel.on('connect', () => {
        let pfs: PeerFileReceive | any;

        if (fileID in this.arrivals) {
          pfs = this.arrivals[fileID];
          pfs.setPeer(fileChannel);
        } else {
          pfs = new PeerFileReceive(fileChannel);
          this.arrivals[fileID] = pfs;
        }

        let destroyed = false;
        const destroy = () => {
          if (destroyed) return;

          controlChannel.removeListener('data', controlDataHandler);
          fileChannel.destroy();
          delete this.arrivals[fileID];

          // garbage collect
          controlDataHandler = null;
          pfs = null;
          destroyed = true;
        };

        pfs.on('done', destroy);
        pfs.on('cancel', destroy);

        resolve(pfs);
      });

      controlChannel.on('data', controlDataHandler);
    });
  }
}

export { PeerFileSend, PeerFileReceive };
