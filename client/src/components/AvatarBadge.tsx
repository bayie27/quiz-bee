const AVATAR_STYLES: Record<string, { color: string; shape: 'circle' | 'square' | 'triangle' | 'diamond' | 'bar' | 'split'; label: string }> = {
  'bau-red-circle': { color: '#d02020', shape: 'circle', label: 'Red circle' },
  'bau-blue-square': { color: '#1040c0', shape: 'square', label: 'Blue square' },
  'bau-yellow-triangle': { color: '#f0c020', shape: 'triangle', label: 'Yellow triangle' },
  'bau-green-diamond': { color: '#128a3c', shape: 'diamond', label: 'Green diamond' },
  'bau-violet-circle': { color: '#7b2cbf', shape: 'circle', label: 'Violet circle' },
  'bau-red-bar': { color: '#d02020', shape: 'bar', label: 'Red bar' },
  'bau-blue-diamond': { color: '#1040c0', shape: 'diamond', label: 'Blue diamond' },
  'bau-yellow-split': { color: '#f0c020', shape: 'split', label: 'Yellow split' }
};

export const AVATAR_IDS = Object.keys(AVATAR_STYLES);

interface AvatarBadgeProps {
  avatar?: string | null;
  size?: number;
  selected?: boolean;
}

export function avatarLabel(avatar?: string | null) {
  return avatar && AVATAR_STYLES[avatar] ? AVATAR_STYLES[avatar].label : 'Bauhaus avatar';
}

export default function AvatarBadge({ avatar, size = 44, selected = false }: AvatarBadgeProps) {
  const style = avatar && AVATAR_STYLES[avatar] ? AVATAR_STYLES[avatar] : AVATAR_STYLES['bau-red-circle'];
  const frameStyle = {
    width: size,
    height: size
  };
  const shapeStyle = {
    background: style.color
  };

  return (
    <span className={'avatar-badge ' + (selected ? 'selected ' : '') + `avatar-${style.shape}`} style={frameStyle} aria-hidden="true">
      <span className="avatar-shape" style={shapeStyle} />
    </span>
  );
}
