import { formatDistanceToNow, format, isFuture } from 'date-fns';

export const formatRelativeTime = (dateString: string): { relative: string; exact: string } => {
  const date = new Date(dateString);
  const now = new Date();
  
  let relative: string;
  if (isFuture(date)) {
    relative = `in ${formatDistanceToNow(date)}`;
  } else {
    relative = formatDistanceToNow(date, { addSuffix: true });
  }
  
  const exact = format(date, 'MMM dd, yyyy • h:mm a');
  
  return { relative, exact };
};