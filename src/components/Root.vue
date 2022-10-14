<template>
  <div class="text-center p-6 max-w-1024px mx-auto">
    <h1 class="font-bold text-3xl">NovelAI 法术解析</h1>
    <p class="text-gray-500 my-2 text-sm">
      从 NovelAI 生成的图片读取内嵌的 prompt
    </p>
    <button
      @click="
        $refs.imageInput.value = null;
        $refs.imageInput.click();
      "
      class="bg-gray-500 cursor-pointer text-white rounded border-none px-3 py-2"
    >
      选择文件
    </button>
    <div v-if="fileRef" class="my-6">
      <div
        class="bg-white max-w-720px mx-auto border border-gray-300 p-2"
        v-if="imageRef"
      >
        <img
          v-if="imageRef"
          v-bind="imageRef"
          alt=""
          style="display: block; width: 100%; height: auto"
        />
      </div>

      <div v-if="fileInfoRef" class="mt-4 text-left max-w-740px mx-auto">
        <h1 class="font-bold text-2xl mb-4">图片信息</h1>
        <div
          :class="[index === 0 && 'border-t border-t-gray-300']"
          class="bg-white border-b border-l border-r px-4 border-b-gray-300 border-l-gray-300 border-r-gray-300 py-2"
          v-for="(item, index) in fileInfoRef"
          :key="item.key"
        >
          <h1 class="font-semibold text-sm text-gray-800">{{ item.key }}</h1>
          <p class="text-wrap break-all text-sm mt-1 text-gray-600">
            {{ item.value }}
          </p>
        </div>
      </div>

      <div v-if="exifRef" class="mt-4 text-left max-w-740px mx-auto">
        <h1 class="font-bold text-2xl mb-4">EXIF</h1>
        <div
          :class="[index === 0 && 'border-t border-t-gray-300']"
          class="bg-white border-b border-l border-r px-4 border-b-gray-300 border-l-gray-300 border-r-gray-300 py-2"
          v-for="(item, index) in exifRef"
          :key="item.key"
        >
          <h1 class="font-semibold text-sm text-gray-800">{{ item.key }}</h1>
          <p class="text-wrap break-all text-sm mt-1 text-gray-600">
            {{ item.value.description }}
          </p>
        </div>
      </div>
    </div>

    <div class="my-4 pt-4">
      <a
        class="inline-block text-sm text-gray-500"
        href="https://github.com/Akegarasu/imagemeta"
        >View on GitHub</a
      >
      <br />
      <span class="inline-block mt-2 text-sm text-gray-500">
        Made with ❤️ by
        <a class="text-gray-500" href="https://github.com/Akegarasu"
          >@Akegarasu</a
        >
      </span>
    </div>
  </div>
  <input
    @change="onImageFileChange"
    ref="imageInput"
    type="file"
    accept="image/*"
    hidden
  />
</template>

<script setup>
import ExifReader from "exifreader";
import { computed, ref, watch } from "vue";
import prettyBytes from "pretty-bytes";
import imageCompression from "browser-image-compression";
import { saveAs } from "file-saver";
import extractChunks from "png-chunks-extract";
import text from "png-chunk-text";

const fileRef = ref(null);
const imageRef = ref(null);
const exifRef = ref(null);
const fileInfoRef = ref(null);
const imageMaxSizeRef = ref(0);
const compressionFormatRef = ref("image/jpeg");
const isExporting = ref(false);

const mimeTypeMap = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const supportedCompressionTypes = ref(Object.keys(mimeTypeMap));
const compressFormatExt = computed(
  () => mimeTypeMap[compressionFormatRef.value]
);

watch(fileRef, () => {
  if (!fileRef.value) return;
  readImageBase64();
  readExif();
  readFileInfo();
});

async function readNovelaiTag(file) {
  const buf = await file.arrayBuffer();
  const chunks = extractChunks(new Uint8Array(buf));
  const textChunks = chunks
    .filter(function (chunk) {
      return chunk.name === "tEXt";
    })
    .map(function (chunk) {
      return text.decode(chunk.data);
    });
  console.log(textChunks);
  return textChunks;
}

async function readFileInfo() {
  const file = fileRef.value;
  let nai = await readNovelaiTag(file);
  fileInfoRef.value = [
    { key: "文件名", value: file.name },
    { key: "文件大小", value: prettyBytes(file.size) },
    ...nai.map((v, k) => {
      return {
        key: v.keyword,
        value: v.text,
      };
    }),
  ];
  if (nai.length == 0) {
    fileInfoRef.value.push({
      key: "提示",
      value: "这可能不是一张NovelAI生成的图或者不是原图经过压缩",
    });
  }
}

function readImageBase64() {
  imageRef.value = null;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const { width, height } = image;
      imageRef.value = {
        width,
        height,
        src: reader.result,
      };

      imageMaxSizeRef.value = width;
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(fileRef.value);
}

async function readExif() {
  const file = fileRef.value;
  const data = await ExifReader.load(file);
  const entries = Object.entries(data);
  exifRef.value = entries.map(([key, value]) => ({ key, value }));
}

function onImageFileChange(e) {
  fileRef.value = e.target.files[0];
}

async function compressFile() {
  const file = fileRef.value;
  if (!file) return;
  isExporting.value = true;
  const maxSize = isNaN(imageMaxSizeRef.value)
    ? Number.POSITIVE_INFINITY
    : parseInt(imageMaxSizeRef.value);

  const result = await imageCompression(file, {
    maxWidthOrHeight: maxSize,
    fileType: compressionFormatRef.value,
  });

  const output = prettyBytes(result.size);
  console.log(`size=${output}`);
  const filename = file.name.split(".").slice(0, -1).join(".");
  await saveAs(result, filename + `.${compressFormatExt.value}`);
  isExporting.value = false;
}
</script>
