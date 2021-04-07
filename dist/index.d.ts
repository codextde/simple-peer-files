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
    private arrivals;
    send(peer: SimplePeer.Instance, fileID: string, file: File): Promise<unknown>;
    receive(peer: SimplePeer.Instance, fileID: string): Promise<unknown>;
}
export { PeerFileSend, PeerFileReceive };
