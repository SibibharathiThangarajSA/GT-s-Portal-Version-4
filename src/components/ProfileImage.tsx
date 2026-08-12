import React, { useEffect, useState } from 'react';

const DEFAULT_AVATAR = '/Assets/default-avatar.svg';

type ProfileImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  src?: string | null;
  alt?: string;
};

export const ProfileImage: React.FC<ProfileImageProps> = ({ src, alt, className, ...rest }) => {
  const [imgSrc, setImgSrc] = useState<string>(src && String(src).trim() ? String(src) : DEFAULT_AVATAR);

  useEffect(() => {
    setImgSrc(src && String(src).trim() ? String(src) : DEFAULT_AVATAR);
  }, [src]);

  const handleError = () => {
    if (imgSrc !== DEFAULT_AVATAR) setImgSrc(DEFAULT_AVATAR);
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
