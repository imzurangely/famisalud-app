import { useState } from "react";

function avatarSource(person) {
  return (
    person?.avatarUrl ||
    person?.avatar_url ||
    person?.person?.avatarUrl ||
    person?.person?.avatar_url ||
    person?.profile?.avatarUrl ||
    person?.profile?.avatar_url ||
    ""
  );
}

/** Avatar compartido que acepta camelCase y snake_case de las respuestas de la API. */
export default function PersonAvatar({
  person,
  initials = "FS",
  alt = "Foto de perfil",
  className = "",
  imageClassName = "",
  fallbackClassName = "",
}) {
  const src = avatarSource(person);
  const [failedSource, setFailedSource] = useState("");

  const baseClass = `flex shrink-0 items-center justify-center overflow-hidden ${className}`.trim();
  if (src && failedSource !== src) {
    return (
      <img
        key={src}
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        className={`${baseClass} object-cover ${imageClassName}`.trim()}
        onError={() => setFailedSource(src)}
      />
    );
  }

  return (
    <span className={`${baseClass} ${fallbackClassName}`.trim()} aria-label={alt}>
      {initials || "FS"}
    </span>
  );
}
