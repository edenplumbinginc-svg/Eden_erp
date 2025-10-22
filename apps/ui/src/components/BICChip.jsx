export default function BICChip({ value }) {
  const text = value || "Unassigned";
  return (
    <span className="inline-flex items-center px-2.5 h-7 rounded-full bg-gray-100 text-gray-700 text-xs border border-gray-200">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
      {text}
    </span>
  );
}
