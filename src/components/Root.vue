<template>
  <div class="text-center p-6 max-w-1024px mx-auto">
    <h1 class="font-bold text-3xl">Stable Diffusion 法术解析</h1>
    <p class="text-gray-500 my-2 text-sm">
      从 Stable Diffusion 生成的图片读取 prompt / Stable Diffusion 模型解析
    </p>
    <div v-if="imgFileRef" class="my-6">
      <div class="bg-white max-w-720px mx-auto border border-gray-300 p-2" v-if="imageRef">
        <img v-if="imageRef" v-bind="imageRef" alt="" style="display: block; width: auto; height: 30vh; margin:auto" />
      </div>
    </div>

    <div class="max-w-740px" style="margin: 0 auto">
      <el-upload class="upload-demo" drag multiple :before-upload="handleUpload">
        <el-icon class="el-icon--upload"><upload-filled /></el-icon>
        <div class="el-upload__text">拖动文件到这里或者点击选择文件</div>
      </el-upload>
    </div>

    <div v-if="imgFileRef" class="my-6">
      <div v-if="imgfileInfoRef" class="mt-4 text-left max-w-740px mx-auto">
        <h1 class="font-bold text-2xl mb-4">图片信息</h1>
        <div :class="[index === 0 && 'border-t border-t-gray-300']"
          class="bg-white border-b border-l border-r px-4 border-b-gray-300 border-l-gray-300 border-r-gray-300 py-2"
          v-for="(item, index) in imgfileInfoRef" :key="item.key">
          <h1 class="font-semibold text-sm text-gray-800">
            {{ item.key }}
            <el-popover placement="top-start" trigger="hover" content="点击复制" style="min-width: 10px"
              v-if="showCopyBtn(item.key)">
              <template #reference>
                <el-button style="margin-left: 6px" :icon="CopyDocument" :link="true" @click="item.key == 'Comment' ? copy(jsonData.uc) : copy(item.value)
                  " />
              </template>
            </el-popover>
          </h1>
          <p class="text-wrap break-all text-sm mt-1 text-gray-600" style="white-space: pre-wrap"
            v-if="!showJsonViewer(item.key)">
            {{ item.value }}
          </p>
          <json-viewer :value="jsonData" v-if="jsonData != null && showJsonViewer(item.key)" :expand-depth=4>
          </json-viewer>
        </div>
      </div>

      <div v-if="exifRef" class="mt-4 text-left max-w-740px mx-auto">
        <h1 class="font-bold text-2xl mb-4">EXIF</h1>
        <div :class="[index === 0 && 'border-t border-t-gray-300']"
          class="bg-white border-b border-l border-r px-4 border-b-gray-300 border-l-gray-300 border-r-gray-300 py-2"
          v-for="(item, index) in exifRef" :key="item.key">
          <h1 class="font-semibold text-sm text-gray-800">{{ item.key }}</h1>
          <p class="text-wrap break-all text-sm mt-1 text-gray-600" style="white-space: pre-wrap">
            {{ item.value.description }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="modelFileRef" class="my-6">
      <div class="mt-4 text-left max-w-740px mx-auto">
        <h1 class="font-bold text-2xl mb-4">模型信息</h1>
        <div :class="[index === 0 && 'border-t border-t-gray-300']"
          class="bg-white border-b border-l border-r px-4 border-b-gray-300 border-l-gray-300 border-r-gray-300 py-2"
          v-for="(item, index) in modelFileInfoRef" :key="item.k">
          <h1 class="font-semibold text-sm text-gray-800">
            {{ item.k }}
          </h1>
          <p class="text-wrap break-all text-sm mt-1 text-gray-600" style="white-space: pre-wrap"
            v-if="item.k != 'Info'">
            {{ item.v }}
          </p>
          <json-viewer :value="jsonData" v-if="item.k == 'Info'" :expand-depth=4></json-viewer>
        </div>
      </div>
      <div class="my-4 pt-4">
        <a class="text-gray-500" href="https://www.bilibili.com/read/cv21362202" target="_blank">图文详解！最全模型用法</a>
      </div>
    </div>

    <p class="text-gray-500 my-2 text-sm">
      *运算完全在你的设备上运行不会上传到云端
    </p>
    <div class="my-4 pt-4">
      如果您觉得本项目对您有帮助 请在 →
      <a class="inline-block text-sm text-gray-500"
        href="https://github.com/Akegarasu/stable-diffusion-inspector">GitHub</a>
      ←上点个star
      <br />
      <span class="inline-block mt-2 text-sm text-gray-500">
        Made with ❤️ by
        <a class="text-gray-500" href="https://github.com/Akegarasu">@Akegarasu</a>
        <a> | </a>
        <a class="text-gray-500" href="https://space.bilibili.com/12566101">秋葉aaaki</a>
        <a> | </a>
        <a class="text-gray-500" href="https://novelai.dev">NovelAI.Dev</a>
        <a> | </a>
        <a class="text-gray-500">Build: {{ commitHash }}</a>
      </span>
    </div>
  </div>
</template>

<style>
.jv-container {
  line-height: 1.2;
}

.jv-code {
  padding: 10px 20px !important;
}
</style>

<script setup lang="ts">
import modelsig from '../assets/modelsig.json'

import { ElMessage } from "element-plus";
import ExifReader from "exifreader";
import { ref, watch } from "vue";
import prettyBytes from "pretty-bytes";
import extractChunks from "png-chunks-extract";
import * as pngChunkText from "png-chunk-text";
import jsonViewer from "vue-json-viewer";
import { UploadFilled, CopyDocument } from "@element-plus/icons-vue";
import useClipboard from "vue-clipboard3";

import { asyncFileReaderAsDataURL, getStealthExif, getSafetensorsMeta, getSafetensorsMetaKohya } from "../utils";

const commitHash = import.meta.env.VITE_COMMIT_HASH || "unknown"

const imgFileRef = ref(null);
const imageRef = ref(null);
const exifRef = ref(null);
const imgfileInfoRef = ref(null);

const modelFileRef = ref(null);
const modelFileInfoRef = ref(null);

const jsonData = ref(null);
const imageMaxSizeRef = ref(0);
const { toClipboard } = useClipboard();

const availableImgExt = ["png", "jpeg", "jpg", "webp", "bmp", "avif"]
const availableModelExt = ["pt", "pth", "ckpt", "safetensors", "bin"]

const copy = (value) => {
  try {
    toClipboard(value);
    ElMessage({
      message: "复制成功",
      type: "success",
    });
  } catch (e) {
    console.log(e);
    ElMessage({
      message: "复制失败",
      type: "warning",
    });
  }
};

const showCopyBtn = (title) => {
  if (!title) return false
  if (
    title == "Description" ||
    title == "Comment" ||
    title == "完整生成信息" ||
    title.indexOf("提示词") != -1
  ) {
    return true;
  }
  return false;
};

const showJsonViewer = (title) => {
  if (
    title == "Comment" ||
    title == "workflow"
  ) {
    return true;
  }
  return false;
};

const cleanData = () => {
  imgFileRef.value = null
  modelFileRef.value = null
  imgfileInfoRef.value = null
  modelFileInfoRef.value = null
  exifRef.value = null
  jsonData.value = null
}

async function handleUpload(file) {
  console.log(file);
  cleanData()

  let fileExt = file.name.split(".").pop().toLowerCase();
  if (availableModelExt.indexOf(fileExt) != -1) {
    modelFileRef.value = file
    inspectModel(file)
  } else if (availableImgExt.indexOf(fileExt) != -1) {
    imgFileRef.value = file;
    inspectImage(file)
  } else {
    ElMessage({
      message: "解析失败，该文件可能不是一个正常的图片/模型文件。",
      type: "error",
    });
  }
  return false;
}

const inspectImage = async (file) => {
  await readImageBase64()
  exifRef.value = await readExif(file)
  imgfileInfoRef.value = await readFileInfo(file)
}

const inspectModel = async (file) => {
  const modelTypes = modelsig.data
  const fileSize = file.size
  const fileExt = file.name.split(".").pop().toLowerCase()

  if (fileSize < 1024 * 10) {
    modelFileInfoRef.value = [{ k: "错误", v: "🤔 文件过小，怀疑可能不是模型文件。停止解析。" }];
    return;
  }

  let modelType: {
    name: string;
    identifier: string;
    usage: string;
    sigs: string[];
  }
  let knownIdentifier = modelTypes.map(x => x.identifier)
  let modelKeysContent = ""
  let metaJson

  if (fileExt == "safetensors") {
    let meta: { [x: string]: any; }
    try {
      meta = await getSafetensorsMeta(file)
    } catch (e) {
      modelFileInfoRef.value = [{ k: "错误", v: "😈 你传了个什么玩意进来？解析失败，该文件可能不是一个正常的模型文件。停止解析。" }];
      return;
    }

    if (meta["__metadata__"]) {
      let data = meta["__metadata__"]

      delete data["modelspec.thumbnail"]

      const jsonKeys = ["ss_bucket_info", "ss_network_args", "ss_dataset_dirs", "ss_tag_frequency"]
      for (let k of jsonKeys) {
        if (data[k] && data[k].length < 10000) {
          data[k] = JSON.parse(data[k])
        }
      }
      metaJson = data
      jsonData.value = data
    }
    const modelKeys = Object.keys(meta).filter(key => key != "__metadata__");
    modelKeysContent = modelKeys.join("\n")
  } else {
    modelKeysContent = await file.slice(0, 1024 * 50).text()
    console.log("[debug] file content: " + modelKeysContent)
  }

  if (knownIdentifier.indexOf(metaJson["modelspec.architecture"]) != -1) {
    modelType = modelTypes.find(x => x.identifier == metaJson["modelspec.architecture"])
  } else {
    for (let m of modelTypes) {
      if (modelType) break;

      for (let sig of m.sigs) {
        if (modelKeysContent.indexOf(sig) != -1) {
          modelType = m
          break
        }
      }
    }
  }

  let modelTypeOk = modelType == null ? "😭 未知模型种类或非模型 如果你坚信这是一个模型文件，请提交issue。" : modelType.name
  let ok = [
    { k: "文件名", v: file.name },
    { k: "文件大小", v: printableBytes(fileSize) },
    { k: "模型种类", v: modelTypeOk },
  ];

  if (modelType != null) {
    ok.push({ k: "模型用法", v: modelType.usage });
  }

  if (fileExt == "safetensors" && jsonData.value) {
    ok.push({ k: "Info", v: jsonData });
  }
  modelFileInfoRef.value = ok;
}


const extractMetadata = async (file) => {
  if (file.type === "image/png") {
    const buf = await file.arrayBuffer();
    let chunks = [];
    try {
      chunks = extractChunks(new Uint8Array(buf));
    } catch (err) {
      return chunks;
    }
    const textChunks = chunks
      .filter(function (chunk) {
        return chunk.name === "tEXt" || chunk.name === "iTXt";
      })
      .map(function (chunk) {
        if (chunk.name === "iTXt") {
          let data = chunk.data.filter((x) => x != 0x0);
          let header = new TextDecoder().decode(data.slice(0, 11));
          if (header == "Description") {
            data = data.slice(11);
            let txt = new TextDecoder().decode(data);
            return {
              keyword: "Description",
              text: txt,
            };
          } else {
            let txt = new TextDecoder().decode(data);
            return {
              keyword: "Unknown",
              text: txt,
            };
          }
        } else {
          return pngChunkText.decode(chunk.data);
        }
      });
    console.log(textChunks);
    return textChunks;
  } else if (file.type === "image/webp" || file.type === "image/jpeg" || file.type === "image/avif") {
    const data = await ExifReader.load(file);
    const metadata = String.fromCodePoint(...(data.UserComment.value)).replaceAll('\x00', '').slice(7);
    return [{ keyword: "parameters", text: metadata }];
  }
}

async function readFileInfo(file) {
  jsonData.value = null

  let metaType = "SD-WEBUI"
  let parsed = []
  let metadata = await extractMetadata(file)

  if (metadata.length == 0) {
    let exif = await getStealthExif(imageRef.value.src)
    if (exif) {
      parsed = Object.keys(exif).map((key) => {
        return {
          keyword: key,
          text: exif[key],
        }
      });
      metaType = "NOVELAI"
    } else {
      return [{
        key: "提示",
        value: "😭 无法读取到图像 Metadata，这可能不是一张 Stable Diffusion 生成的图。或者不是原图, 经过了压缩。",
      }]
    }
  } else if (metadata.length == 1) {
    parsed = await handleWebUiTag(metadata[0])
  } else {
    parsed = metadata
    metaType = "NOVELAI"
  }

  let ok = [
    { key: "文件名", value: file.name },
    { key: "文件大小", value: prettyBytes(file.size) },
    ...parsed.map((v, k) => {
      if (showJsonViewer(v.keyword)) {
        jsonData.value = JSON.parse(v.text);
      }
      return {
        key: v.keyword,
        value: v.text,
      };
    }),
  ]

  if (metaType == "SD-WEBUI") {
    ok.push({ key: "完整生成信息", value: metadata[0]["text"] })
  }

  if (parsed.length == 0) {
    ok.push({
      key: "提示",
      value: "😭 无法读取到图像 Metadata，这可能不是一张 Stable Diffusion 生成的图。或者不是原图, 经过了压缩。",
    })
  }
  return ok
}

const handleWebUiTag = (data) => {
  let [prompts, otherParas] = data.text.split("Steps: ");
  let promptSplit = prompts.split("Negative prompt: ");
  let negativePrompt = promptSplit.length > 1 ? promptSplit[1] : "无";
  return [
    {
      keyword: "提示词",
      text: promptSplit[0],
    },
    {
      keyword: "负面提示词",
      text: negativePrompt,
    },
    {
      keyword: "其他参数",
      text: "Steps: " + otherParas,
    },
  ];
}

const readImageBase64 = async () => {
  imageRef.value = null;
  let result = await asyncFileReaderAsDataURL(imgFileRef.value)
  const image = new Image();
  image.src = result;
  await image.decode();
  const { width, height } = image;
  imageRef.value = {
    width,
    height,
    src: result,
  };
  imageMaxSizeRef.value = width;
}

const readExif = async (file) => {
  try {
    const data = await ExifReader.load(file);
    const entries = Object.entries(data);
    return entries.map(([key, value]) => ({ key, value }));
  }
  catch (MetadataMissingError) {
    return [];
  }
}

const printableBytes = (size) => {
  const printable = (d, z) => {
    return `${d.toFixed(2)} ${z}`;
  };

  let kb = size / 1024;
  if (kb < 1024) {
    return printable(kb, "KB");
  }
  let mb = kb / 1024;
  if (mb < 1024) {
    return printable(mb, "MB");
  }

  let gb = mb / 1024;
  return printable(gb, "GB");
};

</script>
