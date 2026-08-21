import React, { useEffect, useState } from 'react';

const DEFAULT_AVATAR = '/Assets/default-avatar.svg';

type ProfileImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  alt?: string;
  defaultSrc?: string;
};

export const ProfileImage: React.FC<ProfileImageProps> = ({ src, alt, className, defaultSrc = DEFAULT_AVATAR, ...rest }) => {
  const fallback = defaultSrc || DEFAULT_AVATAR;
  const [imgSrc, setImgSrc] = useState<string>(src && String(src).trim() ? String(src) : fallback);

  useEffect(() => {
    setImgSrc(src && String(src).trim() ? String(src) : fallback);
  }, [src, fallback]);

  const handleError = () => {
    if (imgSrc !== fallback) setImgSrc(fallback);
  };

  return (
    // preserve classes and sizing from callers; allow inline onError fallback
    <img
      src={imgSrc}
      alt={alt || 'User avatar'}
      onError={handleError}
      className={className}
      {...rest}
    />
  );
};

export default ProfileImage;

