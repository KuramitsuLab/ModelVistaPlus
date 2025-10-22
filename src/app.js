// app.js - メインアプリケーションロジック

// アプリケーション状態
const appState = {
    reviewerName: '',
    currentFolder: '',
    currentFile: '',
    questions: [],
    currentIndex: 0,
    reviews: {},
    filteredIndices: [],
    currentFilter: 'all',
    selectedDirHandle: null,
    jsonFile: null,
    imageFile: null
};

// DOM要素の取得
const elements = {
    reviewerNameInput: document.getElementById('reviewerName'),
    folderSelect: document.getElementById('folderSelect'),
    jsonSelect: document.getElementById('jsonSelect'),
    jsonSelectLabel: document.getElementById('jsonSelectLabel'),
    folderStatus: document.getElementById('folderStatus'),
    mainContent: document.getElementById('mainContent'),
    footer: document.getElementById('footer'),
    referenceImage: document.getElementById('referenceImage'),
    noImageMessage: document.getElementById('noImageMessage'),
    questionNumber: document.getElementById('questionNumber'),
    remainingCount: document.getElementById('remainingCount'),
    questionTag: document.getElementById('questionTag'),
    questionText: document.getElementById('questionText'),
    choicesContainer: document.getElementById('choicesContainer'),
    metaInfo: document.getElementById('metaInfo'),
    authoredBy: document.getElementById('authoredBy'),
    isTranslated: document.getElementById('isTranslated'),
    approvedRadio: document.getElementById('approvedRadio'),
    rejectedRadio: document.getElementById('rejectedRadio'),
    remarksInput: document.getElementById('remarksInput'),
    prevButton: document.getElementById('prevButton'),
    nextButton: document.getElementById('nextButton'),
    exportButton: document.getElementById('exportButton')
};

// アプリケーション初期化
function initApp() {
    console.log('アプリケーション初期化中...');

    // レビュワー名の復元
    const savedReviewerName = loadReviewerName();
    if (savedReviewerName) {
        elements.reviewerNameInput.value = savedReviewerName;
        appState.reviewerName = savedReviewerName;
    }

    // フォルダ一覧の初期化
    initFolderDropdown();

    // イベントリスナーの設定
    setupEventListeners();

    console.log('アプリケーション初期化完了');
}

// フォルダドロップダウンの初期化
function initFolderDropdown() {
    const folders = getDefaultFolderList();
    folders.forEach(folder => {
        const option = document.createElement('option');
        option.value = folder;
        option.textContent = folder;
        elements.folderSelect.appendChild(option);
    });
}

// イベントリスナーの設定
function setupEventListeners() {
    // レビュワー名の保存
    elements.reviewerNameInput.addEventListener('change', (e) => {
        appState.reviewerName = e.target.value.trim();
        saveReviewerName(appState.reviewerName);
    });

    // フォルダ選択ドロップダウン
    elements.folderSelect.addEventListener('change', handleFolderChange);

    // JSON選択ドロップダウン
    elements.jsonSelect.addEventListener('change', handleJsonChange);

    // 採用/不採用ラジオボタン
    elements.approvedRadio.addEventListener('change', handleReviewDecision);
    elements.rejectedRadio.addEventListener('change', handleReviewDecision);

    // 備考欄
    elements.remarksInput.addEventListener('blur', handleRemarksChange);

    // ナビゲーションボタン
    elements.prevButton.addEventListener('click', () => navigateQuestion(-1));
    elements.nextButton.addEventListener('click', () => navigateQuestion(1));

    // エクスポートボタン
    elements.exportButton.addEventListener('click', () => exportAllResults(appState));

    // キーボードショートカット（オプション）
    document.addEventListener('keydown', handleKeyboardShortcut);
}

// フォルダ選択変更のハンドラ
async function handleFolderChange(e) {
    const selectedFolder = e.target.value;

    if (!selectedFolder) {
        elements.folderStatus.textContent = '';
        elements.jsonSelect.style.display = 'none';
        elements.jsonSelectLabel.style.display = 'none';
        appState.currentFolder = '';
        return;
    }

    // バリデーション
    if (!elements.reviewerNameInput.value.trim()) {
        alert('レビュワー名を入力してください');
        elements.reviewerNameInput.focus();
        elements.folderSelect.value = '';
        return;
    }

    try {
        elements.folderSelect.disabled = true;
        elements.folderStatus.textContent = '検索中...';
        elements.folderStatus.style.color = '#666';

        appState.currentFolder = selectedFolder;

        // 利用可能なJSONファイルをすべて検出
        const availableJsonFiles = await detectAllJsonFiles(selectedFolder);

        if (availableJsonFiles.length === 0) {
            throw new Error('JSONファイルが見つかりません');
        }

        // JSONファイル選択ドロップダウンを表示
        elements.jsonSelect.innerHTML = '<option value="">-- 選択 --</option>';
        availableJsonFiles.forEach(fileName => {
            const option = document.createElement('option');
            option.value = fileName;
            option.textContent = fileName;
            elements.jsonSelect.appendChild(option);
        });

        // 最初のJSONファイルを自動選択
        elements.jsonSelect.value = availableJsonFiles[0];
        elements.jsonSelect.style.display = 'inline-block';
        elements.jsonSelectLabel.style.display = 'inline';

        // ステータス表示
        elements.folderStatus.textContent = `${availableJsonFiles.length}個のJSONファイルが見つかりました`;
        elements.folderStatus.style.color = '#666';

        // 最初のファイルを自動読み込み
        await loadSelectedJson();

    } catch (error) {
        console.error('フォルダ選択エラー:', error);
        alert(`エラー: ${error.message}`);
        elements.folderSelect.value = '';
        elements.folderStatus.textContent = '';
        elements.jsonSelect.style.display = 'none';
        elements.jsonSelectLabel.style.display = 'none';
    } finally {
        elements.folderSelect.disabled = false;
    }
}

// JSON選択変更のハンドラ
async function handleJsonChange(e) {
    const selectedJson = e.target.value;

    if (!selectedJson) {
        return;
    }

    await loadSelectedJson();
}

// 選択されたJSONを読み込む
async function loadSelectedJson() {
    const selectedFolder = appState.currentFolder;
    const selectedJson = elements.jsonSelect.value;

    if (!selectedFolder || !selectedJson) {
        return;
    }

    try {
        elements.jsonSelect.disabled = true;
        elements.folderStatus.textContent = '読み込み中...';
        elements.folderStatus.style.color = '#666';

        appState.currentFile = selectedJson;

        // レビュー済みかどうかをチェック（JSONファイル名に応じたapprovedファイルをチェック）
        const isReviewed = await checkIfReviewed(selectedFolder, selectedJson);

        // ステータス表示
        let statusText = selectedJson;
        if (isReviewed) {
            statusText += ` | ✅ レビュー済み`;
        }
        elements.folderStatus.textContent = statusText;
        elements.folderStatus.style.color = isReviewed ? '#28a745' : '#666';

        // データを読み込んで表示
        await loadFolderData(selectedFolder, selectedJson);

    } catch (error) {
        console.error('JSON読み込みエラー:', error);
        alert(`エラー: ${error.message}`);
    } finally {
        elements.jsonSelect.disabled = false;
    }
}

// 利用可能なすべてのJSONファイルを検出
async function detectAllJsonFiles(folderName) {
    const validNames = ['qa_new_ja.json', 'qa_new_ja2.json'];
    const foundFiles = [];

    console.log(`フォルダ ${folderName} でJSONファイルを検索中...`);

    for (const fileName of validNames) {
        const path = `../model/${folderName}/${fileName}`;
        console.log(`  チェック: ${path}`);
        try {
            const response = await fetch(path, { method: 'HEAD' });
            console.log(`    ステータス: ${response.status} ${response.ok ? '(OK)' : '(NG)'}`);
            if (response.ok) {
                console.log(`  ✓ JSONファイル検出: ${fileName}`);
                foundFiles.push(fileName);
            }
        } catch (error) {
            console.log(`    エラー: ${error.message}`);
            continue;
        }
    }

    console.log(`検出されたファイル: ${foundFiles.length}個`);
    return foundFiles;
}

// レビュー済みかどうかをチェック
// JSONファイル名に応じたapprovedファイルの存在をチェック
// 例: qa_new_ja.json → qa_new_ja_approved.json
//     qa_new_ja2.json → qa_new_ja2_approved.json
async function checkIfReviewed(folderName, jsonFileName) {
    // ファイル名のベース（拡張子を除く）を取得
    const baseFileName = jsonFileName.replace('.json', '');
    const approvedFilePath = `../model/${folderName}/${baseFileName}_approved.json`;

    console.log(`レビュー済みチェック: ${approvedFilePath}`);

    try {
        const response = await fetch(approvedFilePath, { method: 'HEAD' });
        console.log(`  結果: ${response.ok ? 'レビュー済み' : '未レビュー'}`);
        return response.ok;
    } catch (error) {
        console.log(`  結果: 未レビュー (エラー)`);
        return false;
    }
}

// フォルダデータを読み込んで表示
async function loadFolderData(folderName, jsonFileName) {
    const jsonPath = `../model/${folderName}/${jsonFileName}`;

    // JSONファイルの読み込み
    const response = await fetch(jsonPath);
    if (!response.ok) {
        throw new Error(`JSONファイルが見つかりません: ${jsonPath}`);
    }

    const questions = await response.json();

    // スキーマ検証
    if (!Array.isArray(questions)) {
        throw new Error('JSONファイルは配列形式である必要があります');
    }

    questions.forEach((q, index) => {
        if (!q.tag || !q.question || !q.choice || !Array.isArray(q.choice)) {
            throw new Error(`問題${index + 1}のスキーマが不正です`);
        }
        if (q.choice.length !== 4) {
            throw new Error(`問題${index + 1}の選択肢は4つ必要です`);
        }
    });

    appState.questions = questions;

    // 画像の読み込み
    const imagePath = `../model/${folderName}/dgpowerpoint_ja-fs8.png`;
    try {
        const imgResponse = await fetch(imagePath, { method: 'HEAD' });
        if (imgResponse.ok) {
            elements.referenceImage.src = imagePath;
            elements.referenceImage.style.display = 'block';
            elements.noImageMessage.style.display = 'none';
        } else {
            throw new Error('画像が見つかりません');
        }
    } catch (error) {
        console.warn('画像の読み込みに失敗しました:', error.message);
        elements.referenceImage.style.display = 'none';
        elements.noImageMessage.style.display = 'block';
    }

    // レビュー状態の復元
    const savedReviewState = loadReviewState(folderName, jsonFileName);
    if (savedReviewState && savedReviewState.reviews) {
        appState.reviews = savedReviewState.reviews;
        console.log('レビュー状態を復元しました');
    } else {
        appState.reviews = {};
    }

    // 最初の問題を表示
    appState.currentIndex = 0;
    displayQuestion(appState.currentIndex);

    // UIの表示
    elements.mainContent.style.display = 'block';
    elements.footer.style.display = 'flex';

    console.log(`問題を読み込みました: ${questions.length}問`);
}

// 読み込みボタンのハンドラ（削除予定）
async function handleLoadButton() {
    try {
        // バリデーション
        if (!elements.reviewerNameInput.value.trim()) {
            alert('レビュワー名を入力してください');
            elements.reviewerNameInput.focus();
            return;
        }

        if (!appState.currentFolder) {
            alert('フォルダを選択してください');
            return;
        }

        // ローディング表示
        elements.loadButton.disabled = true;
        elements.loadButton.textContent = '読み込み中...';

        // JSONファイルのパスを構築して読み込み
        const jsonFileName = await detectJsonFileName(appState.currentFolder);
        const jsonPath = `../model/${appState.currentFolder}/${jsonFileName}`;

        const response = await fetch(jsonPath);
        if (!response.ok) {
            throw new Error(`JSONファイルが見つかりません: ${jsonPath}`);
        }

        const questions = await response.json();

        // スキーマ検証
        if (!Array.isArray(questions)) {
            throw new Error('JSONファイルは配列形式である必要があります');
        }

        questions.forEach((q, index) => {
            if (!q.tag || !q.question || !q.choice || !Array.isArray(q.choice)) {
                throw new Error(`問題${index + 1}のスキーマが不正です`);
            }
            if (q.choice.length !== 4) {
                throw new Error(`問題${index + 1}の選択肢は4つ必要です`);
            }
        });

        appState.questions = questions;
        appState.currentFile = jsonFileName;

        // 画像の読み込み
        const imagePath = `../model/${appState.currentFolder}/dgpowerpoint_ja-fs8.png`;
        try {
            const imgResponse = await fetch(imagePath, { method: 'HEAD' });
            if (imgResponse.ok) {
                elements.referenceImage.src = imagePath;
                elements.referenceImage.style.display = 'block';
                elements.noImageMessage.style.display = 'none';
            } else {
                throw new Error('画像が見つかりません');
            }
        } catch (error) {
            console.warn('画像の読み込みに失敗しました:', error.message);
            elements.referenceImage.style.display = 'none';
            elements.noImageMessage.style.display = 'block';
        }

        // レビュー状態の復元
        const savedReviewState = loadReviewState(appState.currentFolder, appState.currentFile);
        if (savedReviewState && savedReviewState.reviews) {
            appState.reviews = savedReviewState.reviews;
            console.log('レビュー状態を復元しました');
        } else {
            appState.reviews = {};
        }

        // 最初の問題を表示
        appState.currentIndex = 0;
        displayQuestion(appState.currentIndex);

        // UIの表示
        elements.mainContent.style.display = 'block';
        elements.footer.style.display = 'flex';

        console.log(`問題を読み込みました: ${questions.length}問`);

    } catch (error) {
        console.error('読み込みエラー:', error);
        alert(`エラー: ${error.message}`);
    } finally {
        elements.loadButton.disabled = false;
        elements.loadButton.textContent = '読み込み';
    }
}

// 問題を表示
function displayQuestion(index) {
    if (index < 0 || index >= appState.questions.length) {
        console.error('無効なインデックス:', index);
        return;
    }

    const question = appState.questions[index];
    appState.currentIndex = index;

    // 進捗情報の更新
    updateProgressInfo();

    // タグ
    elements.questionTag.textContent = `タグ: ${question.tag}`;

    // 問題文
    elements.questionText.textContent = question.question;

    // 選択肢
    elements.choicesContainer.innerHTML = '';
    question.choice.forEach((choice, i) => {
        const choiceDiv = document.createElement('div');
        choiceDiv.className = 'choice-item';

        // 1番目（choice[0]）は正解
        if (i === 0) {
            choiceDiv.classList.add('correct');
        }

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'choice';
        radio.className = 'choice-radio';
        radio.disabled = true;

        const label = document.createElement('span');
        label.className = 'choice-label';
        label.textContent = choice;

        choiceDiv.appendChild(radio);

        // 正解マーク
        if (i === 0) {
            const indicator = document.createElement('span');
            indicator.className = 'correct-indicator';
            indicator.textContent = '★正解: ';
            choiceDiv.appendChild(indicator);
        }

        choiceDiv.appendChild(label);
        elements.choicesContainer.appendChild(choiceDiv);
    });

    // メタ情報
    elements.authoredBy.textContent = question.authored_by || '-';
    elements.isTranslated.textContent = question.is_translated ? 'あり' : 'なし';

    // レビュー結果の復元
    const review = appState.reviews[index];
    if (review) {
        if (review.decision === 'approved') {
            elements.approvedRadio.checked = true;
            elements.rejectedRadio.checked = false;
        } else if (review.decision === 'rejected') {
            elements.approvedRadio.checked = false;
            elements.rejectedRadio.checked = true;
        }
        elements.remarksInput.value = review.remarks || '';
    } else {
        elements.approvedRadio.checked = false;
        elements.rejectedRadio.checked = false;
        elements.remarksInput.value = '';
    }

    // ナビゲーションボタンの状態
    updateNavigationButtons();
}

// 進捗情報の更新
function updateProgressInfo() {
    const total = appState.questions.length;
    const current = appState.currentIndex + 1;
    const progress = getReviewProgress(appState.reviews, total);

    elements.questionNumber.textContent = `第${current}問 / 全${total}問`;
    elements.remainingCount.textContent = `残り ${progress.unreviewed}問`;
}

// ナビゲーションボタンの状態を更新
function updateNavigationButtons() {
    const isFirstQuestion = appState.currentIndex === 0;
    const isLastQuestion = appState.currentIndex === appState.questions.length - 1;
    const hasDecision = elements.approvedRadio.checked || elements.rejectedRadio.checked;

    elements.prevButton.disabled = isFirstQuestion;

    if (isLastQuestion) {
        elements.nextButton.textContent = '完了';
        elements.nextButton.disabled = !hasDecision;
    } else {
        elements.nextButton.textContent = '次へ';
        elements.nextButton.disabled = !hasDecision;
    }
}

// レビュー判定のハンドラ
function handleReviewDecision() {
    const decision = elements.approvedRadio.checked ? 'approved' : 'rejected';
    const remarks = elements.remarksInput.value.trim();

    // レビュー結果を保存
    appState.reviews[appState.currentIndex] = {
        decision: decision,
        remarks: remarks,
        timestamp: new Date().toISOString()
    };

    // LocalStorageに保存
    saveReviewState(appState);

    // ナビゲーションボタンの状態を更新
    updateNavigationButtons();

    // 進捗情報の更新
    updateProgressInfo();

    console.log(`レビュー保存: 問題${appState.currentIndex + 1} - ${decision}`);
}

// 備考欄の変更ハンドラ
function handleRemarksChange() {
    const review = appState.reviews[appState.currentIndex];
    if (review) {
        review.remarks = elements.remarksInput.value.trim();
        saveReviewState(appState);
    }
}

// ナビゲーション
function navigateQuestion(direction) {
    let newIndex = appState.currentIndex + direction;

    // 範囲チェック
    if (newIndex < 0) {
        newIndex = 0;
    } else if (newIndex >= appState.questions.length) {
        // 最後の問題で「次へ」（完了）を押した場合
        if (direction > 0) {
            const progress = getReviewProgress(appState.reviews, appState.questions.length);
            if (progress.reviewed === progress.total) {
                alert('すべての問題のレビューが完了しました!\n\n「エクスポート」ボタンで結果を出力してください。');
            } else {
                alert(`まだ ${progress.unreviewed} 問がレビューされていません。`);
            }
        }
        return;
    }

    displayQuestion(newIndex);
}

// キーボードショートカット
function handleKeyboardShortcut(e) {
    // メインコンテンツが表示されていない場合は無効
    if (elements.mainContent.style.display === 'none') {
        return;
    }

    // テキストエリアにフォーカスがある場合は無効
    if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        return;
    }

    switch (e.key) {
        case 'ArrowLeft':
            if (!elements.prevButton.disabled) {
                navigateQuestion(-1);
            }
            break;
        case 'ArrowRight':
            if (!elements.nextButton.disabled) {
                navigateQuestion(1);
            }
            break;
    }
}

// アプリケーション起動
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});
