import pako from 'pako';

class DataReader {

    data: number[]
    index: number

    constructor(data) {
        this.data = data;
        this.index = 0;
    }

    readBit() {
        return this.data[this.index++];
    }

    readNBits(n) {
        let bits: number[] = [];
        for (let i = 0; i < n; i++) {
            bits.push(this.readBit());
        }
        return bits;
    }

    readByte() {
        let byte = 0;
        for (let i = 0; i < 8; i++) {
            byte |= this.readBit() << (7 - i);
        }
        return byte;
    }

    readNBytes(n) {
        let bytes: number[] = [];
        for (let i = 0; i < n; i++) {
            bytes.push(this.readByte());
        }
        return bytes;
    }

    readInt32() {
        let bytes = this.readNBytes(4);
        return new DataView(new Uint8Array(bytes).buffer).getInt32(0, false);
    }
}

export const asyncFileReaderAsDataURL = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            resolve(e.target?.result);
        };
        reader.onerror = (e) => {
            reject(e);
        };
        reader.readAsDataURL(file);
    });
};

export const tryExtractSafetensorsMeta = (content) => {
    const jsonKeys = ["ss_bucket_info", "ss_network_args", "ss_dataset_dirs", "ss_tag_frequency"]
    let metadataStr = '{';
    let i = content.indexOf('__metadata__');
    if (i == -1) {
        console.log("no metadata found")
        return null;
    }
    i += 15; // skip `__metadata__':{`
    let braceCount = 1;
    while (braceCount > 0 && i < content.length) {
        metadataStr += content[i];
        if (content[i] === '{') {
            braceCount++;
        } else if (content[i] === '}') {
            braceCount--;
        }
        i++;
    }
    console.log("[debug] metadata: " + metadataStr)
    const data = JSON.parse(metadataStr);
    for (let k of jsonKeys) {
        if (data[k]) {
            data[k] = JSON.parse(data[k])
        }
    }
    return data;
};

export const tryExtractSafetensorsMetaFull = async (file: File) => {
    let buf = await file.slice(0, 8).arrayBuffer()
    let dv = new DataView(buf, 0);
    let metaLen = dv.getInt32(0, true)
    let metaBuf = await file.slice(8, metaLen + 8).text()
    let meta = JSON.parse(metaBuf)
    if (!meta["__metadata__"]) {
        console.log("no metadata found")
        return null;
    }
    let data = meta["__metadata__"]
    const jsonKeys = ["ss_bucket_info", "ss_network_args", "ss_dataset_dirs", "ss_tag_frequency"]
    for (let k of jsonKeys) {
        if (data[k] && data[k].length < 10000) {
            data[k] = JSON.parse(data[k])
        }
    }
    return data;
};


export async function getStealthExif(src) {
    let time = performance.now();

    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: true })!;
    let img = new Image();
    img.src = src;

    await img.decode();

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    let imageData = ctx.getImageData(0, 0, img.width, img.height);
    let lowestData: number[] = [];

    for (let x = 0; x < img.width; x++) {
        for (let y = 0; y < img.height; y++) {
            let index = (y * img.width + x) * 4;
            let a = imageData.data[index + 3];
            lowestData.push(a & 1);
        }
    }

    console.log("Time taken: ", performance.now() - time, "ms");

    const magic = "stealth_pngcomp";
    const reader = new DataReader(lowestData);
    const readMagic = reader.readNBytes(magic.length);
    const magicString = String.fromCharCode.apply(null, readMagic);

    if (magic === magicString) {
        const dataLength = reader.readInt32();
        const gzipData = reader.readNBytes(dataLength / 8);
        const data = pako.ungzip(new Uint8Array(gzipData));
        const jsonString = new TextDecoder().decode(new Uint8Array(data));
        const json = JSON.parse(jsonString);
        return json;
    } else {
        console.log("Magic number not found.");
    }

    return null;
}