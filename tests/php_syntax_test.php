<?php

$root = dirname(__DIR__);
$files = new RecursiveIteratorIterator(
  new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS)
);
$failures = [];

foreach ($files as $file) {
  if (!$file->isFile() || strtolower($file->getExtension()) !== 'php') continue;

  $path = $file->getPathname();
  $relative = str_replace('\\', '/', substr($path, strlen($root) + 1));
  if (str_starts_with($relative, '.git/') || str_starts_with($relative, 'node_modules/')) continue;

  $output = [];
  $status = 0;
  exec(escapeshellarg(PHP_BINARY) . ' -l ' . escapeshellarg($path) . ' 2>&1', $output, $status);
  if ($status !== 0) {
    $failures[] = $relative . "\n" . implode("\n", $output);
  }
}

if (!empty($failures)) {
  fwrite(STDERR, "PHP syntax checks failed:\n" . implode("\n\n", $failures) . "\n");
  exit(1);
}

echo "PHP syntax checks passed.\n";
