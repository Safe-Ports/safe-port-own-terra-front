import "./rental-photo.css";

export const RENTAL_PHOTO_POSITIONS = ["top-left", "top-right", "bottom-left", "bottom-right"];

export default function RentalPhoto({ position = "top-left", imageUrl = "", className = "", children }) {
  const style = imageUrl ? { backgroundImage:`url("${imageUrl}")` } : undefined;
  return <div className={`rental-photo rental-photo--${imageUrl ? "custom" : position} ${className}`.trim()} style={style}>{children}</div>;
}
