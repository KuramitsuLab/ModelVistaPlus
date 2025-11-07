/**
 * メインアプリケーションロジック
 * レビュー画面の制御と問題の管理
 */

// グローバル状態
let currentProblemSet = null;
let currentQuestionIndex = 0;
let questions = [];
let reviewerName = '';
let answers = {};
let reviewIds = {}; // 各問題のreview_idを保存

/**
 * ページ読み込み時の初期化
 */
document.addEventListener('DOMContentLoaded', async function() {
    // review.htmlの場合のみ初期化
    if (window.location.pathname.includes('review.html')) {
        await initReviewPage();
    }
});

/**
 * レビュー画面の初期化
 */
async function initReviewPage() {
    try {
        // URLパラメータから問題セットを取得
        const urlParams = new URLSearchParams(window.location.search);
        const problemSet = urlParams.get('set');
        const customUrl = urlParams.get('custom');

        // レビューア情報を取得
        const storedReviewerName = localStorage.getItem('reviewerName');
        if (!storedReviewerName) {
            alert('レビューア情報が見つかりません。ホーム画面に戻ります。');
            window.location.href = 'index.html';
            return;
        }

        reviewerName = storedReviewerName;

        // レビューア名を表示
        document.getElementById('reviewerName').textContent = reviewerName;

        // 問題セットを読み込み
        let data;
        if (customUrl) {
            data = await GitHubClient.loadFromCustomUrl(decodeURIComponent(customUrl));
        } else if (problemSet) {
            data = await GitHubClient.loadProblemSet(problemSet);
            document.getElementById('problemSetName').textContent = `問題セット: ${problemSet}`;
        } else {
            throw new Error('問題セットが指定されていません');
        }

        currentProblemSet = data;
        questions = data.questions;

        // 選択肢ボタンにイベントリスナーを追加
        setupChoiceButtons();

        // 最初の問題を表示
        displayQuestion(0);

        // ローディング画面を非表示、コンテンツを表示
        document.getElementById('loadingScreen').style.display = 'none';
        document.getElementById('reviewContent').style.display = 'block';

    } catch (error) {
        console.error('初期化エラー:', error);
        alert(`エラーが発生しました: ${error.message}`);
        window.location.href = 'index.html';
    }
}

/**
 * 選択肢ボタンのイベントリスナーを設定
 */
function setupChoiceButtons() {
    const container = document.querySelector('.choices');
    const buttons = container.querySelectorAll('.choice-btn');

    buttons.forEach(button => {
        button.addEventListener('click', function() {
            const choiceIndex = parseInt(this.getAttribute('data-choice'));
            selectChoice(choiceIndex);
        });
    });
}

/**
 * 選択肢を選択
 */
function selectChoice(choiceIndex) {
    // 既に選択されているボタンの選択を解除
    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach(btn => btn.classList.remove('selected'));

    // 新しいボタンを選択
    buttons[choiceIndex].classList.add('selected');

    // 回答を記録（まだ提出していない場合のみ）
    if (answers[currentQuestionIndex] === undefined) {
        // まだ提出していない
    }
}

/**
 * 問題を表示
 */
function displayQuestion(index) {
    currentQuestionIndex = index;
    const question = questions[index];

    // 残り問題数を更新
    const remainingCount = questions.length - index;
    document.getElementById('headerRemainingCount').textContent = `残り${remainingCount}問`;

    // 問題情報を表示
    document.getElementById('questionTag').textContent = question.tag || '問題';
    document.getElementById('questionText').textContent = question.question;

    // 画像を表示
    const imagePath = currentProblemSet.imagePath;
    document.getElementById('questionImage').src = imagePath;

    // 選択肢を表示
    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach((button, i) => {
        button.textContent = question.choice[i];
        button.disabled = false;
        button.classList.remove('selected', 'correct', 'incorrect');

        // 以前の回答があれば復元
        if (answers[index] === i) {
            button.classList.add('selected');
        }
    });

    // 結果セクションを非表示
    document.getElementById('resultSection').style.display = 'none';

    // ボタンの状態を更新
    updateNavigationButtons();
}

/**
 * ナビゲーションボタンの状態を更新
 */
function updateNavigationButtons() {
    const prevBtn = document.getElementById('prevBtn');
    const submitBtn = document.getElementById('submitBtn');
    const nextBtn = document.getElementById('nextBtn');
    const finishBtn = document.getElementById('finishBtn');

    // 前へボタン
    if (currentQuestionIndex > 0) {
        prevBtn.style.display = 'inline-block';
    } else {
        prevBtn.style.display = 'none';
    }

    // 回答済みかどうかで表示を切り替え
    if (answers[currentQuestionIndex] !== undefined) {
        submitBtn.style.display = 'none';
        if (currentQuestionIndex < questions.length - 1) {
            nextBtn.style.display = 'inline-block';
            finishBtn.style.display = 'none';
        } else {
            nextBtn.style.display = 'none';
            finishBtn.style.display = 'inline-block';
        }
    } else {
        submitBtn.style.display = 'inline-block';
        nextBtn.style.display = 'none';
        finishBtn.style.display = 'none';
    }
}

/**
 * 回答を提出
 */
function submitAnswers() {
    // 選択されている回答を取得
    const selectedButton = document.querySelector('.choice-btn.selected');
    if (!selectedButton) {
        alert('回答を選択してください');
        return;
    }

    const selectedIndex = parseInt(selectedButton.getAttribute('data-choice'));
    answers[currentQuestionIndex] = selectedIndex;

    // 正解は常に最初の選択肢（インデックス0）
    const correctAnswer = 0;

    // 結果を表示（コメント欄もこのタイミングで表示される）
    displayResults(correctAnswer);

    // 選択肢ボタンを無効化
    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach(button => {
        button.disabled = true;
    });

    // ナビゲーションボタンを更新
    updateNavigationButtons();

    // コメント欄をクリア
    const commentTextarea = document.getElementById('comment');
    if (commentTextarea) {
        commentTextarea.value = '';
    }

    // 結果を保存（コメントは空で保存）
    const reviewId = saveReviewResult(correctAnswer, '');
    reviewIds[currentQuestionIndex] = reviewId;
}

/**
 * 結果を表示
 */
function displayResults(correctAnswer) {
    const resultSection = document.getElementById('resultSection');
    const resultContent = document.getElementById('resultContent');
    const correctAnswerText = document.getElementById('correctAnswerText');

    // 結果をクリア
    resultContent.innerHTML = '';

    // 結果を表示
    const answer = answers[currentQuestionIndex];
    const isCorrect = answer === correctAnswer;

    const resultDiv = document.createElement('div');
    resultDiv.className = `reviewer-result ${isCorrect ? 'correct' : 'incorrect'}`;
    resultDiv.innerHTML = `
        <h4>あなたの回答</h4>
        <p><strong>選択:</strong> ${questions[currentQuestionIndex].choice[answer]}</p>
        <p><strong>判定:</strong> ${isCorrect ? '✓ 正解' : '✗ 不正解'}</p>
    `;
    resultContent.appendChild(resultDiv);

    // 選択肢ボタンの色を更新
    const buttons = document.querySelectorAll('.choice-btn');
    buttons[answer].classList.remove('selected');
    buttons[answer].classList.add(isCorrect ? 'correct' : 'incorrect');
    buttons[correctAnswer].classList.add('correct');

    // 正解を表示
    correctAnswerText.textContent = questions[currentQuestionIndex].choice[correctAnswer];

    // 結果セクションを表示
    resultSection.style.display = 'block';

    // 結果セクションにスクロール
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * 現在の問題のコメントを更新保存
 */
function updateCurrentComment() {
    // 現在の問題が回答済みでない場合はスキップ
    if (answers[currentQuestionIndex] === undefined) {
        return;
    }

    const commentTextarea = document.getElementById('comment');
    const comment = commentTextarea ? commentTextarea.value.trim() : '';
    const reviewId = reviewIds[currentQuestionIndex];

    if (!reviewId) {
        return;
    }

    // localStorageから全データを取得
    const allResults = JSON.parse(localStorage.getItem('review_results') || '[]');

    // 該当するreview_idのデータを更新
    const resultIndex = allResults.findIndex(r => r.review_id === reviewId);
    if (resultIndex !== -1) {
        allResults[resultIndex].comment = comment;
        localStorage.setItem('review_results', JSON.stringify(allResults));
        console.log('コメントを更新しました:', reviewId, comment);
    }
}

/**
 * 前の問題へ
 */
function prevQuestion() {
    // 現在の問題のコメントを保存
    updateCurrentComment();

    if (currentQuestionIndex > 0) {
        displayQuestion(currentQuestionIndex - 1);
    }
}

/**
 * 次の問題へ
 */
function nextQuestion() {
    // 現在の問題のコメントを保存
    updateCurrentComment();

    if (currentQuestionIndex < questions.length - 1) {
        displayQuestion(currentQuestionIndex + 1);
    }
}

/**
 * レビュー完了
 */
function finishReview() {
    // 現在の問題のコメントを保存
    updateCurrentComment();

    // 完了メッセージを表示
    const totalQuestions = questions.length;
    let correctCount = 0;

    // 正解数を計算
    for (let i = 0; i < totalQuestions; i++) {
        if (answers[i] === 0) { // 正解は常にインデックス0
            correctCount++;
        }
    }

    const percentage = ((correctCount / totalQuestions) * 100).toFixed(1);
    const message = `レビューが完了しました！\n\n【結果】\n${reviewerName}: ${correctCount}/${totalQuestions}問正解 (${percentage}%)`;

    alert(message);

    // ホーム画面に戻る
    window.location.href = 'index.html';
}

/**
 * ホームに戻る
 */
function backToHome() {
    if (confirm('レビューを中断してホームに戻りますか？')) {
        window.location.href = 'index.html';
    }
}

/**
 * レビュー結果を保存
 * @param {number} correctAnswer - 正解のインデックス
 * @param {string} comment - コメント（デフォルトは空）
 * @returns {string} - review_id
 */
function saveReviewResult(correctAnswer, comment = '') {
    const question = questions[currentQuestionIndex];
    const reviewId = generateUniqueId();
    const timestamp = new Date().toISOString();

    // 結果データを作成
    const result = {
        review_id: reviewId,
        question_id: `${currentProblemSet.problemSet}_q${currentQuestionIndex + 1}`,
        question_set: currentProblemSet.problemSet,
        question_index: currentQuestionIndex,
        question_tag: question.tag,
        question_text: question.question,
        reviewer_name: reviewerName,
        answer: answers[currentQuestionIndex],
        correct_answer: correctAnswer,
        is_correct: answers[currentQuestionIndex] === correctAnswer,
        timestamp: timestamp,
        comment: comment
    };

    // ストレージに保存
    if (window.StorageManager) {
        StorageManager.saveResult(result);

        // S3が有効な場合は自動アップロード
        if (window.AWS_CONFIG && window.AWS_CONFIG.enabled) {
            StorageManager.uploadToS3(result).catch(err => {
                console.error('S3自動アップロードエラー:', err);
            });
        }
    } else {
        // フォールバック: localStorage
        const allResults = JSON.parse(localStorage.getItem('review_results') || '[]');
        allResults.push(result);
        localStorage.setItem('review_results', JSON.stringify(allResults));
    }

    console.log('レビュー結果を保存しました:', result);
    return reviewId;
}

/**
 * ユニークIDを生成
 */
function generateUniqueId() {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// グローバル関数として公開
window.submitAnswers = submitAnswers;
window.prevQuestion = prevQuestion;
window.nextQuestion = nextQuestion;
window.finishReview = finishReview;
window.backToHome = backToHome;
