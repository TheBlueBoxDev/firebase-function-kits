/*
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
export type SafetyThreshold =
  | "BLOCK_LOW_AND_ABOVE"
  | "BLOCK_MEDIUM_AND_ABOVE"
  | "BLOCK_ONLY_HIGH"
  | "BLOCK_NONE";

import {
  BUCKET_PICKER,
  defineInt,
  defineString,
  select,
} from "firebase-functions/params";

export const imgBucket = defineString("IMG_BUCKET", {
  label: "Cloud Storage bucket for images",
  input: BUCKET_PICKER,
});

export const imgSizes = defineString("IMG_SIZES", {
  label: "Sizes of resized images",
  default: "200x200",
  input: {
    text: {
      nonEmpty: true,
      validationRegex: /^\d+x(\d+,\d+x)*\d+$/,
      validationErrorMessage:
        "Invalid sizes, expected comma-separated WIDTHxHEIGHT values.",
    },
  },
});

const deleteOriginalFileParam = defineString("DELETE_ORIGINAL_FILE", {
  label: "Deletion of original file",
  default: "false",
  input: select({
    "Don't delete": "false",
    "Delete on any resize attempt": "true",
    "Delete only after successful resizing": "on_success",
  }),
});

const makePublic = defineString("MAKE_PUBLIC", {
  label: "Make resized images public",
  default: "false",
  input: select({ Yes: "true", No: "false" }),
});

const resizedImagesPath = defineString("RESIZED_IMAGES_PATH", {
  label: "Cloud Storage path for resized images",
  default: "",
});

const includePathList = defineString("INCLUDE_PATH_LIST", {
  label: "Paths that contain images to resize",
  default: "",
});

const excludePathList = defineString("EXCLUDE_PATH_LIST", {
  label: "Paths excluded from resizing",
  default: "",
});

const failedImagesPath = defineString("FAILED_IMAGES_PATH", {
  label: "Cloud Storage path for failed images",
  default: "",
});

const cacheControlHeader = defineString("CACHE_CONTROL_HEADER", {
  label: "Cache-Control header for resized images",
  default: "",
});

const imageType = defineString("IMAGE_TYPE", {
  label: "Output image types",
  default: "false",
});

const outputOptions = defineString("OUTPUT_OPTIONS", {
  label: "Output options for selected formats",
  default: "",
});

const sharpOptions = defineString("SHARP_OPTIONS", {
  label: "Sharp constructor options",
  default: "{}",
});

const isAnimated = defineString("IS_ANIMATED", {
  label: "Keep GIF and WebP animation",
  default: "true",
  input: select({ Yes: "true", "No (first frame only)": "false" }),
});

export const functionMemory = defineInt("FUNCTION_MEMORY", {
  label: "Cloud Function memory in MB",
  default: 1024,
  input: select({
    "512 MB": 512,
    "1 GB": 1024,
    "2 GB": 2048,
    "4 GB": 4096,
    "8 GB": 8192,
  }),
});

const regenerateToken = defineString("REGENERATE_TOKEN", {
  label: "Assign a new Firebase Storage download token",
  default: "true",
  input: select({ Yes: "true", No: "false" }),
});

const contentFilterLevel = defineString("CONTENT_FILTER_LEVEL", {
  label: "Content filter level",
  default: "OFF",
  input: select([
    "OFF",
    "BLOCK_ONLY_HIGH",
    "BLOCK_MEDIUM_AND_ABOVE",
    "BLOCK_LOW_AND_ABOVE",
  ]),
});

const customFilterPrompt = defineString("CUSTOM_FILTER_PROMPT", {
  label: "Custom content filter prompt",
  default: "",
});

const placeholderImagePath = defineString("PLACEHOLDER_IMAGE_PATH", {
  label: "Path to placeholder image",
  default: "",
});

export const functionDefaultRegion = defineString("FUNCTION_DEFAULT_REGION", {
  label: "Cloud Functions region",
  default: "us-central1",
  input: { text: { nonEmpty: true } },
});

export enum deleteImage {
  always = 0,
  never,
  onSuccess,
}

function deleteOriginalFile(deleteType) {
  switch (deleteType) {
    case "true":
      return deleteImage.always;
    case "false":
      return deleteImage.never;
    default:
      return deleteImage.onSuccess;
  }
}

function paramToArray(param) {
  return typeof param === "string" && param.length > 0
    ? param.split(",")
    : undefined;
}

function allowAnimated(sharpOptions = "{}", overrideIsAnimated) {
  const ops = JSON.parse(sharpOptions || "{}");
  if (ops && ops.animated) {
    return true;
  }

  return overrideIsAnimated === "true" || undefined ? true : false;
}

const harmBlockThresholdMap: Record<string, SafetyThreshold | null> = {
  BLOCK_LOW_AND_ABOVE: "BLOCK_LOW_AND_ABOVE",
  BLOCK_MEDIUM_AND_ABOVE: "BLOCK_MEDIUM_AND_ABOVE",
  BLOCK_ONLY_HIGH: "BLOCK_ONLY_HIGH",
  OFF: null,
};

export const convertHarmBlockThreshold = (
  level?: string
): SafetyThreshold | null => {
  if (!level) {
    return null;
  }

  if (level in harmBlockThresholdMap) {
    return harmBlockThresholdMap[level];
  }
  throw new Error(`Invalid HarmBlockThreshold: ${level}`);
};

export const config = {
  get bucket() {
    return imgBucket.value();
  },
  get cacheControlHeader() {
    return cacheControlHeader.value() || undefined;
  },
  // Backfill feature disabled - commented out to preserve code
  // doBackfill: process.env.DO_BACKFILL === "true",
  get imageSizes() {
    return imgSizes.value().split(",");
  },
  get regenerateToken() {
    return (regenerateToken.value() || "true") === "true";
  },
  get makePublic() {
    return makePublic.value() === "true";
  },
  get resizedImagesPath() {
    return resizedImagesPath.value() || undefined;
  },
  get includePathList() {
    return paramToArray(includePathList.value());
  },
  get excludePathList() {
    return paramToArray(excludePathList.value());
  },
  get failedImagesPath() {
    return failedImagesPath.value() || undefined;
  },
  get deleteOriginalFile() {
    return deleteOriginalFile(deleteOriginalFileParam.value());
  },
  get imageTypes() {
    return paramToArray(imageType.value() || "false");
  },
  get sharpOptions() {
    return sharpOptions.value() || "{}";
  },
  get outputOptions() {
    return outputOptions.value() || undefined;
  },
  get animated() {
    return allowAnimated(
      sharpOptions.value() || "{}",
      isAnimated.value() || "true"
    );
  },
  get location() {
    return functionDefaultRegion.value() || "us-central1";
  },
  get projectId() {
    return process.env.GCLOUD_PROJECT;
  },
  get contentFilterLevel() {
    return convertHarmBlockThreshold(contentFilterLevel.value());
  },
  get customFilterPrompt() {
    return customFilterPrompt.value() || null;
  },
  get placeholderImagePath() {
    return placeholderImagePath.value() || null;
  },
  // backfillBatchSize: Number(process.env.BACKFILL_BATCH_SIZE) || 3,
};

export type Config = typeof config;
