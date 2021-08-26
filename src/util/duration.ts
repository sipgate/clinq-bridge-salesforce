import moment from "moment";

export function formatDuration(ms: number): string {
  const duration = moment.duration(ms);
  const minutes = Math.floor(duration.asMinutes());
  const seconds =
    duration.seconds() < 10 ? `0${duration.seconds()}` : duration.seconds();
  return `${minutes}:${seconds} min`;
}
