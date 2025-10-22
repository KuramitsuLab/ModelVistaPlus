// exporter.js - JSON出力処理

/**
 * 採用問題のJSONを生成
 * @param {Array} questions - 全問題配列
 * @param {Object} reviews - レビュー結果
 * @param {string} reviewerName - レビュワー名
 * @returns {Array} 採用問題配列
 */
function generateApprovedJson(questions, reviews, reviewerName) {
    const approved = [];

    Object.keys(reviews).forEach(index => {
        const review = reviews[index];
        if (review.decision === 'approved') {
            const question = { ...questions[index] };
            question.review = {
                reviewer: reviewerName,
                decision: 'approved',
                remarks: review.remarks || '',
                timestamp: review.timestamp
            };
            approved.push(question);
        }
    });

    return approved;
}

/**
 * 不採用問題のJSONを生成
 * @param {Array} questions - 全問題配列
 * @param {Object} reviews - レビュー結果
 * @param {string} reviewerName - レビュワー名
 * @returns {Array} 不採用問題配列
 */
function generateRejectedJson(questions, reviews, reviewerName) {
    const rejected = [];

    Object.keys(reviews).forEach(index => {
        const review = reviews[index];
        if (review.decision === 'rejected') {
            const question = { ...questions[index] };
            question.review = {
                reviewer: reviewerName,
                decision: 'rejected',
                remarks: review.remarks || '',
                timestamp: review.timestamp
            };
            rejected.push(question);
        }
    });

    return rejected;
}

/**
 * 単一JSONファイルのレビュー状態を生成
 * @param {Object} state - アプリケーション状態
 * @param {Object} reviews - レビュー結果
 * @returns {Object} レビュー状態オブジェクト
 */
function generateSingleReviewStatus(state, reviews) {
    const progress = getReviewProgress(reviews, state.questions.length);

    // 最初のレビュー時刻を取得
    let startedAt = null;
    let completedAt = null;
    const reviewDetails = [];

    Object.keys(reviews).forEach(index => {
        const review = reviews[index];
        const timestamp = new Date(review.timestamp);

        if (!startedAt || timestamp < new Date(startedAt)) {
            startedAt = review.timestamp;
        }

        if (!completedAt || timestamp > new Date(completedAt)) {
            completedAt = review.timestamp;
        }

        reviewDetails.push({
            questionIndex: parseInt(index),
            decision: review.decision,
            remarks: review.remarks || '',
            timestamp: review.timestamp
        });
    });

    // レビュー完了しているか
    const isComplete = progress.reviewed === progress.total;

    return {
        fileName: state.currentFile,
        reviewerName: state.reviewerName,
        totalQuestions: progress.total,
        reviewedQuestions: progress.reviewed,
        approvedCount: progress.approved,
        rejectedCount: progress.rejected,
        isComplete: isComplete,
        startedAt: startedAt,
        completedAt: isComplete ? completedAt : null,
        reviews: reviewDetails.sort((a, b) => a.questionIndex - b.questionIndex)
    };
}

/**
 * JSONファイルをダウンロード
 * @param {Object|Array} data - JSON データ
 * @param {string} filename - ファイル名
 */
function downloadJson(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // クリーンアップ
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);

    console.log(`ダウンロード: ${filename}`);
}

/**
 * 全結果を一括エクスポート（フォルダに直接保存）
 * @param {Object} state - アプリケーション状態
 */
async function exportAllResults(state) {
    const { questions, reviews, reviewerName, currentFile, currentFolder } = state;

    // レビューが完了しているかチェック
    const progress = getReviewProgress(reviews, questions.length);
    if (progress.reviewed === 0) {
        alert('レビューが1つも完了していません。まず問題をレビューしてください。');
        return;
    }

    // 確認ダイアログ
    const message = `以下の内容でエクスポートします:\n\n` +
                    `フォルダ: ${currentFolder}\n` +
                    `ファイル: ${currentFile}\n` +
                    `レビュワー: ${reviewerName}\n\n` +
                    `全問題数: ${progress.total}\n` +
                    `レビュー済み: ${progress.reviewed}\n` +
                    `採用: ${progress.approved}\n` +
                    `不採用: ${progress.rejected}\n\n` +
                    `model/${currentFolder}/ フォルダに保存します。\nよろしいですか?`;

    if (!confirm(message)) {
        return;
    }

    try {
        // ファイル名のベース（拡張子を除く）
        // 例: qa_new_ja.json → qa_new_ja
        //     qa_new_ja2.json → qa_new_ja2
        const baseFileName = currentFile.replace('.json', '');

        const savedFiles = [];

        // 採用問題をエクスポート
        if (progress.approved > 0) {
            const approvedData = generateApprovedJson(questions, reviews, reviewerName);
            const approvedFileName = `${baseFileName}_approved.json`;
            await saveJsonToFolder(approvedData, currentFolder, approvedFileName);
            savedFiles.push(approvedFileName);
        }

        // 不採用問題をエクスポート
        if (progress.rejected > 0) {
            const rejectedData = generateRejectedJson(questions, reviews, reviewerName);
            const rejectedFileName = `${baseFileName}_rejected.json`;
            await saveJsonToFolder(rejectedData, currentFolder, rejectedFileName);
            savedFiles.push(rejectedFileName);
        }

        // レビュー状態をエクスポート（フォルダ全体で1つのreview_status.json）
        await updateReviewStatus(currentFolder, state, reviews);
        savedFiles.push('review_status.json');

        // 成功メッセージ
        alert(`エクスポートが完了しました!\n\n保存先: model/${currentFolder}/\n\n保存されたファイル:\n${savedFiles.map(f => '- ' + f).join('\n')}`);

    } catch (error) {
        console.error('エクスポートエラー:', error);
        alert(`エクスポートに失敗しました: ${error.message}`);
    }
}

/**
 * JSONデータをサーバーに保存
 * @param {Object|Array} data - JSON データ
 * @param {string} folderName - フォルダ名
 * @param {string} filename - ファイル名
 */
async function saveJsonToFolder(data, folderName, filename) {
    const jsonString = JSON.stringify(data, null, 2);

    // サーバーに保存リクエストを送信
    const response = await fetch('/save-json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            folderName: folderName,
            filename: filename,
            data: jsonString
        })
    });

    if (!response.ok) {
        throw new Error(`ファイル保存に失敗しました: ${filename}`);
    }

    console.log(`保存完了: model/${folderName}/${filename}`);
}

/**
 * review_status.jsonを更新（既存のものに追記）
 * @param {string} folderName - フォルダ名
 * @param {Object} state - アプリケーション状態
 * @param {Object} reviews - レビュー結果
 */
async function updateReviewStatus(folderName, state, reviews) {
    const reviewStatusPath = `../model/${folderName}/review_status.json`;

    // 既存のreview_status.jsonを読み込む
    let existingStatus = {
        folderName: folderName,
        reviews: {}
    };

    try {
        const response = await fetch(reviewStatusPath);
        if (response.ok) {
            const loadedData = await response.json();
            console.log('既存のreview_status.jsonを読み込みました');

            // 古い形式（フラット構造）かどうかをチェック
            if (loadedData.fileName && !loadedData.reviews) {
                // 古い形式: { folderName, fileName, reviewerName, ... }
                console.log('古い形式のreview_status.jsonを検出。新形式に変換します。');
                existingStatus = {
                    folderName: folderName,
                    reviews: {}
                };
                // 古いデータを新形式のreviews配下に格納
                const oldFileName = loadedData.fileName;
                delete loadedData.folderName; // folderNameは最上位に移動
                existingStatus.reviews[oldFileName] = loadedData;
            } else if (loadedData.reviews) {
                // 新しい形式: { folderName, reviews: { ... } }
                existingStatus = loadedData;
            }
        }
    } catch (error) {
        console.log('新しいreview_status.jsonを作成します');
    }

    // 現在のJSONファイルのレビュー状態を生成
    const currentReviewStatus = generateSingleReviewStatus(state, reviews);

    // 既存のレビュー状態に追加/更新
    if (!existingStatus.reviews) {
        existingStatus.reviews = {};
    }
    existingStatus.reviews[state.currentFile] = currentReviewStatus;

    // folderNameを確実に設定
    existingStatus.folderName = folderName;

    // 最終更新日時を記録
    existingStatus.lastUpdated = new Date().toISOString();

    console.log('保存するreview_status:', JSON.stringify(existingStatus, null, 2));

    // 保存
    await saveJsonToFolder(existingStatus, folderName, 'review_status.json');
    console.log(`review_status.jsonを更新: ${state.currentFile}`);
}

/**
 * エクスポート可能かチェック
 * @param {Object} state - アプリケーション状態
 * @returns {Object} チェック結果
 */
function canExport(state) {
    const errors = [];

    if (!state.reviewerName) {
        errors.push('レビュワー名が入力されていません');
    }

    if (!state.currentFolder) {
        errors.push('フォルダが選択されていません');
    }

    if (!state.currentFile) {
        errors.push('ファイルが選択されていません');
    }

    if (state.questions.length === 0) {
        errors.push('問題が読み込まれていません');
    }

    if (Object.keys(state.reviews).length === 0) {
        errors.push('レビューが1つも完了していません');
    }

    return {
        canExport: errors.length === 0,
        errors: errors
    };
}
