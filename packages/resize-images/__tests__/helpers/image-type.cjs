// Keep native import() outside the TypeScript CommonJS transform so Jest can
// load the ESM-only detector with --experimental-vm-modules.
module.exports = async function detectImageType(buffer) {
  const { default: imageType } = await import("image-type");
  return imageType(buffer);
};
