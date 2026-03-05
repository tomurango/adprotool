'use client';

import Link from 'next/link';

interface ProjectCardProps {
  id: string;
  name: string;
  description: string | null;
  checklistCompleted: number;
  checklistTotal: number;
}

export function ProjectCard({
  id,
  name,
  description,
  checklistCompleted,
  checklistTotal,
}: ProjectCardProps) {
  const progress = checklistTotal > 0 ? Math.round((checklistCompleted / checklistTotal) * 100) : 0;

  return (
    <Link href={`/projects/${id}`}>
      <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900 line-clamp-1">{name}</h2>
          <span className="ml-2 shrink-0 text-sm font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {checklistCompleted}/{checklistTotal}
          </span>
        </div>
        {description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{description}</p>
        )}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>発信準備</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
