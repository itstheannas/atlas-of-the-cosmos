"use client";

import { useMemo, useState } from "react";
import {
  catalogueById,
  glossary,
  learningArticles,
  sourceById,
  type CosmosExhibit,
} from "../../lib/cosmos-data";
import { formatUiMessage, type UiCopy } from "../../lib/i18n";
import { normalizeSearchText } from "../../packages/catalogue-client/src/search";
import { cssVars } from "./css-vars";

type LearningLevel = "beginner" | "student" | "advanced";

interface LearningViewProps {
  readonly copy: UiCopy;
  readonly onOpenObject: (object: CosmosExhibit) => void;
}

export function LearningView({ copy, onOpenObject }: LearningViewProps) {
  const [level, setLevel] = useState<LearningLevel>("student");
  const [articleId, setArticleId] = useState(learningArticles[0].id);
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [glossaryQuery, setGlossaryQuery] = useState("");
  const article =
    learningArticles.find((candidate) => candidate.id === articleId) ??
    learningArticles[0];

  const glossaryResults = useMemo(() => {
    const query = normalizeSearchText(glossaryQuery);
    return glossary
      .filter((entry) =>
        query
          ? normalizeSearchText(
              `${entry.term} ${entry.shortDefinition} ${entry.relatedTerms.join(" ")}`,
            ).includes(query)
          : true,
      )
      .slice(0, 12);
  }, [glossaryQuery]);

  function selectArticle(id: string) {
    setArticleId(id);
    setAnswer(null);
    setChecked(false);
  }

  return (
    <div className="content-view learning-view">
      <header className="section-heading">
        <div>
          <p className="eyebrow">{copy.learningView.eyebrow}</p>
          <h1>{copy.learningTitle}</h1>
          <p>{copy.learningDek}</p>
        </div>
        <div
          className="level-selector"
          role="group"
          aria-label={copy.learningView.explanationLevel}
        >
          {(["beginner", "student", "advanced"] as const).map((item) => (
            <button
              type="button"
              key={item}
              className={level === item ? "is-active" : undefined}
              aria-pressed={level === item}
              onClick={() => setLevel(item)}
            >
              <span aria-hidden="true">
                {item === "beginner" ? "Ⅰ" : item === "student" ? "Ⅱ" : "Ⅲ"}
              </span>
              {copy[item]}
            </button>
          ))}
        </div>
      </header>

      <div className="learning-layout">
        <nav className="learning-index" aria-label={copy.learningView.topics}>
          {learningArticles.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={item.id === article.id ? "is-active" : undefined}
              aria-current={item.id === article.id ? "page" : undefined}
              onClick={() => selectArticle(item.id)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item.title}</strong>
              <small>{item.dek}</small>
            </button>
          ))}
        </nav>

        <article className="learning-article">
          <header>
            <p className="eyebrow">
              {formatUiMessage(copy.learningView.explanationHeading, {
                level: copy[level],
              })}
            </p>
            <h2>{article.title}</h2>
            <p>{article.dek}</p>
          </header>
          <p className="learning-primary-copy">{article.explanations[level]}</p>

          <section className="evidence-callout">
            <span aria-hidden="true">⌁</span>
            <div>
              <h3>{copy.howWeKnow}</h3>
              <p>{article.howWeKnow}</p>
            </div>
          </section>

          <section className="misconception-card">
            <p className="eyebrow">{copy.misconception}</p>
            <h3>“{article.misconception.claim}”</h3>
            <p>{article.misconception.correction}</p>
          </section>

          <section className="uncertainty-card">
            <h3>{copy.uncertainties}</h3>
            <p>{article.uncertaintyNote}</p>
          </section>

          <section>
            <h3>{copy.learningView.exploreEvidence}</h3>
            <div className="learning-object-links">
              {article.explorerObjectIds.map((objectId) => {
                const object = catalogueById.get(objectId);
                return object ? (
                  <button
                    type="button"
                    key={object.id}
                    onClick={() => onOpenObject(object)}
                  >
                    <span
                      style={cssVars({
                        "--object-colour": object.visual.colour,
                      })}
                      aria-hidden="true"
                    >
                      {object.visual.glyph}
                    </span>
                    <strong>{object.name}</strong>
                    <small>{copy.returnExplorer} →</small>
                  </button>
                ) : null;
              })}
            </div>
          </section>

          <section className="knowledge-check">
            <p className="eyebrow">{copy.knowledgeCheck}</p>
            <h3>{article.knowledgeCheck.prompt}</h3>
            <div role="radiogroup" aria-label={copy.knowledgeCheck}>
              {article.knowledgeCheck.choices.map((choice, index) => (
                <label key={choice}>
                  <input
                    type="radio"
                    name={`knowledge-${article.id}`}
                    checked={answer === index}
                    onChange={() => {
                      setAnswer(index);
                      setChecked(false);
                    }}
                  />
                  <span>{choice}</span>
                </label>
              ))}
            </div>
            <button
              type="button"
              className="secondary-button"
              disabled={answer === null}
              onClick={() => setChecked(true)}
            >
              {copy.checkAnswer}
            </button>
            {checked && answer !== null ? (
              <p
                className={
                  answer === article.knowledgeCheck.correctChoiceIndex
                    ? "answer-correct"
                    : "answer-incorrect"
                }
                role="status"
              >
                <strong>
                  {answer === article.knowledgeCheck.correctChoiceIndex
                    ? copy.learningView.correctResult
                    : copy.learningView.tryAgainResult}
                </strong>{" "}
                {article.knowledgeCheck.explanation}
              </p>
            ) : null}
          </section>

          <footer className="article-sources">
            <p className="eyebrow">{copy.learningView.sources}</p>
            {article.sourceIds.map((sourceId) => {
              const source = sourceById.get(sourceId);
              return source ? (
                <a
                  key={source.id}
                  href={source.citationUrl}
                  {...(source.citationUrl.startsWith("https://")
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                >
                  <strong>
                    {source.provider} · {source.dataset}
                  </strong>
                  <small>
                    {source.citation} · {source.version} ·{" "}
                    {source.publicationOrSnapshotDate}
                  </small>
                </a>
              ) : null;
            })}
          </footer>
        </article>
      </div>

      <section className="glossary-section">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">{copy.learningView.glossaryCount}</p>
            <h2>{copy.glossary}</h2>
          </div>
          <label className="catalogue-search">
            <span className="sr-only">{copy.learningView.searchGlossary}</span>
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={glossaryQuery}
              placeholder={copy.learningView.glossaryPlaceholder}
              onChange={(event) => setGlossaryQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="glossary-grid">
          {glossaryResults.map((entry) => (
            <article key={entry.slug}>
              <span className={`evidence-badge status-${entry.level}`}>
                {entry.level}
              </span>
              <h3>{entry.term}</h3>
              <p>{entry.shortDefinition}</p>
              <details>
                <summary>{copy.learningView.expandedDefinition}</summary>
                <p>{entry.expandedDefinition}</p>
              </details>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
