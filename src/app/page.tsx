'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectCard } from '@/components/ProjectCard';
import { NewProjectModal } from '@/components/NewProjectModal';

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  checklistTotal: number;
  checklistCompleted: number;
}

export default function Home() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        setProjects(data);
        setLoading(false);
      });
  }, []);

  function handleCreated(project: { id: string }) {
    setShowModal(false);
    router.push(`/projects/${project.id}`);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">こうこくーる</h1>
            <p className="text-sm text-gray-500 mt-1">発信伴走AI</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            + 新規プロジェクト
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">読み込み中...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">まだプロジェクトがありません</p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              最初のプロジェクトを作る
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {projects.map(p => (
              <ProjectCard
                key={p.id}
                id={p.id}
                name={p.name}
                description={p.description}
                checklistCompleted={p.checklistCompleted ?? 0}
                checklistTotal={p.checklistTotal ?? 0}
              />
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <NewProjectModal
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </main>
  );
}
