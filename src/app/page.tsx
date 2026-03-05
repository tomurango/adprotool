'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ProjectCard } from '@/components/ProjectCard';
import { NewProjectModal } from '@/components/NewProjectModal';

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  checklistTotal: number;
  checklistCompleted: number;
}

const STEPS = [
  {
    num: '1',
    title: 'プロジェクトを作る',
    desc: '発信したいサービスや作品をプロジェクトとして登録します。',
    icon: '📁',
  },
  {
    num: '2',
    title: 'AIインタビューに答える',
    desc: 'AIが「なぜ作ったか」「どんな思いか」を引き出す質問をします。チャット形式で自然に話すだけでOK。',
    icon: '💬',
  },
  {
    num: '3',
    title: 'チェックシートを埋める',
    desc: '7つの発信準備項目を会話を通じて埋めていきます。',
    icon: '✅',
  },
  {
    num: '4',
    title: '投稿文・スクリプトを生成',
    desc: '回答をもとにSNS投稿文や動画スクリプトをAIが自動生成。そのまま投稿できます。',
    icon: '✨',
  },
];

function OnboardingGuide({ onStart }: { onStart: () => void }) {
  return (
    <div className="max-w-xl mx-auto">
      {/* ウェルカムメッセージ */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-4">📣</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">ようこそ、こうこくーるへ</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          あなたのサービスや作品の「思い」を引き出し、<br />
          SNS投稿文・動画スクリプトに変換する発信伴走AIです。
        </p>
      </div>

      {/* ステップガイド */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-5">使い方</h3>
        <div className="space-y-5">
          {STEPS.map((step, i) => (
            <div key={step.num} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-lg shrink-0">
                  {step.icon}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 bg-gray-100 mt-2" />
                )}
              </div>
              <div className="pb-5">
                <p className="text-sm font-semibold text-gray-900 mb-0.5">{step.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 事前準備メモ */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-xs text-amber-700">
        <p className="font-semibold mb-1">はじめる前に</p>
        <p>
          AIを使うにはAPIキーが必要です。
          まず右上の「設定」からGemini・Claude・OpenAIいずれかのAPIキーを登録してください。
        </p>
      </div>

      <button
        onClick={onStart}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors"
      >
        最初のプロジェクトを作る
      </button>
    </div>
  );
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
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">こうこくーる</h1>
            <p className="text-sm text-gray-500 mt-1">発信伴走AI</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/settings"
              className="text-gray-400 hover:text-gray-600 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 transition-colors"
            >
              設定
            </Link>
            {projects.length > 0 && (
              <button
                onClick={() => setShowModal(true)}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                + 新規プロジェクト
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">読み込み中...</div>
        ) : projects.length === 0 ? (
          <OnboardingGuide onStart={() => setShowModal(true)} />
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
