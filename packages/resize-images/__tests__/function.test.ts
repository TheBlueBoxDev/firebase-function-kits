/**
 * Copyright 2026 Google LLC
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

// Define your mock functions first
const logMock = jest.fn().mockReturnValue(0);
const errorLogMock = jest.fn().mockReturnValue(0);
const warnLogMock = jest.fn().mockReturnValue(0);

jest.mock("firebase-functions", () => {
  return {
    requiresAPI: jest.fn(),
    requiresRole: jest.fn(),
    setGlobalOptions: jest.fn(),
    logger: {
      log: jest.fn((...args) => logMock(...args)), // Spread operator to pass all arguments
      error: jest.fn((...args) => errorLogMock(...args)),
      warn: jest.fn((...args) => warnLogMock(...args)),
    },
  };
});

jest.mock("firebase-functions/v2/storage", () => ({
  onObjectFinalized: jest.fn((_options, handler) => handler),
}));

jest.mock("firebase-admin/app", () => ({ initializeApp: jest.fn() }));
jest.mock("firebase-admin/storage", () => ({
  getStorage: jest.fn(() => ({ bucket: jest.fn(() => ({})) })),
}));

jest.mock("../src/config", () => {
  return {
    config: {
      location: "us-central1",
      imgBucket: "extensions-testing.appspot.com",
      cacheControlHeader: undefined,
      imgSizes: ["200x200"],
      resizedImagesPath: undefined,
      deleteOriginalFile: "true",
      // backfillBatchSize: 3,
    },
  };
});

describe("extension", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("'generateResizedImage' function is exported", () => {
    const exportedFunctions = jest.requireActual("../src");
    expect(exportedFunctions.generateResizedImage).toBeInstanceOf(Function);
    const { requiresRole } = jest.requireMock("firebase-functions");
    expect(requiresRole).toHaveBeenCalledWith(
      "roles/eventarc.eventReceiver"
    );
  });
});
