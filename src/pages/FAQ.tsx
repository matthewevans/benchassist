import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Mail, ExternalLink } from 'lucide-react';
import { NavBar } from '@/components/layout/NavBar.tsx';
import { cn } from '@/lib/utils.ts';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSection {
  key: string;
  label: string;
  items: FAQItem[];
}

function useFAQSections(): FAQSection[] {
  const { t } = useTranslation('faq');

  return [
    {
      key: 'getting_started',
      label: t('sections.getting_started'),
      items: [
        { question: t('getting_started.what_is_q'), answer: t('getting_started.what_is_a') },
        { question: t('getting_started.how_start_q'), answer: t('getting_started.how_start_a') },
        {
          question: t('getting_started.bulk_import_q'),
          answer: t('getting_started.bulk_import_a'),
        },
        { question: t('getting_started.gysa_q'), answer: t('getting_started.gysa_a') },
      ],
    },
    {
      key: 'rotations',
      label: t('sections.rotations'),
      items: [
        { question: t('rotations.how_fair_q'), answer: t('rotations.how_fair_a') },
        { question: t('rotations.constraints_q'), answer: t('rotations.constraints_a') },
        { question: t('rotations.skill_ranking_q'), answer: t('rotations.skill_ranking_a') },
        { question: t('rotations.positions_q'), answer: t('rotations.positions_a') },
      ],
    },
    {
      key: 'install',
      label: t('sections.install'),
      items: [
        { question: t('install.install_iphone_q'), answer: t('install.install_iphone_a') },
        { question: t('install.install_android_q'), answer: t('install.install_android_a') },
        { question: t('install.why_install_q'), answer: t('install.why_install_a') },
        { question: t('install.offline_q'), answer: t('install.offline_a') },
      ],
    },
    {
      key: 'during_games',
      label: t('sections.during_games'),
      items: [
        { question: t('during_games.live_game_q'), answer: t('during_games.live_game_a') },
        { question: t('during_games.mid_game_q'), answer: t('during_games.mid_game_a') },
        { question: t('during_games.swap_q'), answer: t('during_games.swap_a') },
      ],
    },
    {
      key: 'practice',
      label: t('sections.practice'),
      items: [
        { question: t('practice.what_is_q'), answer: t('practice.what_is_a') },
        { question: t('practice.age_bracket_q'), answer: t('practice.age_bracket_a') },
        { question: t('practice.favorites_q'), answer: t('practice.favorites_a') },
      ],
    },
    {
      key: 'data_privacy',
      label: t('sections.data_privacy'),
      items: [
        { question: t('data_privacy.where_data_q'), answer: t('data_privacy.where_data_a') },
        { question: t('data_privacy.transfer_q'), answer: t('data_privacy.transfer_a') },
        { question: t('data_privacy.lose_data_q'), answer: t('data_privacy.lose_data_a') },
      ],
    },
  ];
}

export function FAQ() {
  const { t } = useTranslation('faq');
  const { t: tCommon } = useTranslation('common');
  const sections = useFAQSections();
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  function toggle(key: string) {
    setExpandedKey((prev) => (prev === key ? null : key));
  }

  return (
    <div>
      <NavBar title={t('title')} backTo="/settings" backLabel={tCommon('nav.settings')} />

      <div className="max-w-4xl mx-auto px-4 md:px-5 space-y-9 pt-4">
        {/* Contact section */}
        <section>
          <h2 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
            {t('sections.contact')}
          </h2>
          <div className="bg-card rounded-[10px] overflow-hidden">
            <a
              href="mailto:matt@benchassist.app"
              className="flex items-center justify-between w-full min-h-11 px-4 text-ios-body active:bg-[#D1D1D6] dark:active:bg-[#3A3A3C] transition-colors border-b border-border/50"
            >
              <div className="flex items-center gap-3 py-2.5">
                <Mail className="size-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <div>{t('contact.email')}</div>
                  <div className="text-ios-caption1 text-muted-foreground">
                    {t('contact.email_description')}
                  </div>
                </div>
              </div>
              <ExternalLink className="size-4 text-[#C7C7CC] dark:text-[#48484A] shrink-0 ml-2" />
            </a>
            <a
              href="https://github.com/matthewevans/benchassist/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between w-full min-h-11 px-4 text-ios-body active:bg-[#D1D1D6] dark:active:bg-[#3A3A3C] transition-colors"
            >
              <div className="flex items-center gap-3 py-2.5">
                <GitHubIcon className="size-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <div>{t('contact.github')}</div>
                  <div className="text-ios-caption1 text-muted-foreground">
                    {t('contact.github_description')}
                  </div>
                </div>
              </div>
              <ExternalLink className="size-4 text-[#C7C7CC] dark:text-[#48484A] shrink-0 ml-2" />
            </a>
          </div>
        </section>

        {/* FAQ sections */}
        {sections.map((section) => (
          <section key={section.key}>
            <h2 className="text-ios-footnote font-normal text-muted-foreground uppercase px-4 pb-1.5">
              {section.label}
            </h2>
            <div className="bg-card rounded-[10px] overflow-hidden">
              {section.items.map((item, i) => {
                const itemKey = `${section.key}-${i}`;
                const isExpanded = expandedKey === itemKey;
                const isLast = i === section.items.length - 1;

                return (
                  <div key={itemKey}>
                    <button
                      onClick={() => toggle(itemKey)}
                      aria-expanded={isExpanded}
                      className={cn(
                        'flex items-center justify-between w-full min-h-11 px-4 text-ios-body text-left',
                        'active:bg-[#D1D1D6] dark:active:bg-[#3A3A3C] transition-colors',
                        !isLast && !isExpanded && 'border-b border-border/50',
                      )}
                    >
                      <span className="flex-1 min-w-0 py-2.5 pr-2">{item.question}</span>
                      <ChevronRight
                        className={cn(
                          'size-5 text-[#C7C7CC] dark:text-[#48484A] shrink-0 transition-transform duration-200',
                          isExpanded && 'rotate-90',
                        )}
                      />
                    </button>
                    <div
                      className={cn(
                        'grid transition-[grid-template-rows] duration-200 ease-out',
                        isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                      )}
                    >
                      <div className="overflow-hidden">
                        <p
                          className={cn(
                            'px-4 pb-3 text-ios-subheadline text-muted-foreground leading-relaxed',
                            !isLast && 'border-b border-border/50',
                          )}
                        >
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
