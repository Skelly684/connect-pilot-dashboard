import { formatDistanceToNow, format, isFuture } from 'date-fns';

export const formatRelativeTime = (dateString: string): { relative: string; exact: string } => {
  if (!dateString) {
    return { relative: 'Unknown', exact: 'Unknown' };
  }
  
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return { relative: 'Invalid date', exact: 'Invalid date' };
  }
  
  const now = new Date();
  
  let relative: string;
  try {
    if (isFuture(date)) {
      relative = `in ${formatDistanceToNow(date)}`;
    } else {
      relative = formatDistanceToNow(date, { addSuffix: true });
    }
  } catch (error) {
    relative = 'Unknown';
  }
  
  let exact: string;
  try {
    exact = format(date, 'MMM dd, yyyy • h:mm a');
  } catch (error) {
    exact = 'Invalid date';
  }
  
  return { relative, exact };
};