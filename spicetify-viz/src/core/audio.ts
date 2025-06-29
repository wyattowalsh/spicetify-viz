export class AudioService {
    private audioContext: AudioContext | null = null;
    private analyser: AnalyserNode | null = null;
    private source: MediaElementAudioSourceNode | null = null;
    private audioEl: HTMLAudioElement | null = null;

    public connect(): void {
        if (this.analyser) return;

        const audioEl = document.querySelector('audio');
        if (!audioEl) {
            Spicetify.showNotification('Could not find audio element', true);
            return;
        }
        this.audioEl = audioEl;

        this.audioContext = new AudioContext();
        this.source = this.audioContext.createMediaElementSource(this.audioEl);
        this.analyser = this.audioContext.createAnalyser();

        this.source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);

        this.analyser.fftSize = 4096;
        this.analyser.smoothingTimeConstant = 0.8;
    }

    public getAnalyser(): AnalyserNode {
        if (!this.analyser) {
            this.connect();
        }
        return this.analyser!;
    }

    public getFrequencyData(targetArray: Uint8Array): void {
        this.getAnalyser().getByteFrequencyData(targetArray);
    }

    public getWaveformData(targetArray: Uint8Array): void {
        this.getAnalyser().getByteTimeDomainData(targetArray);
    }
}

export const audio = new AudioService(); 