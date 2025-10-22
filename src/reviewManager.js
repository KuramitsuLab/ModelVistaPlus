// reviewManager.js - レビュー状態管理

/**
 * レビュー状態をLocalStorageに保存
 * @param {Object} state - アプリケーション状態
 */
function saveReviewState(state) {
    const key = getStorageKey(state.currentFolder, state.currentFile);
    const reviewState = {
        reviewerName: state.reviewerName,
        folderName: state.currentFolder,
        fileName: state.currentFile,
        lastModified: new Date().toISOString(),
        reviews: state.reviews
    };

    try {
        localStorage.setItem(key, JSON.stringify(reviewState));
        console.log('レビュー状態を保存しました:', key);
    } catch (error) {
        console.error('LocalStorageへの保存に失敗しました:', error);
        alert('レビュー状態の保存に失敗しました。容量制限に達している可能性があります。');
    }
}

/**
 * レビュー状態をLocalStorageから読み込み
 * @param {string} folderName - フォルダ名
 * @param {string} fileName - ファイル名
 * @returns {Object|null} レビュー状態
 */
function loadReviewState(folderName, fileName) {
    const key = getStorageKey(folderName, fileName);

    try {
        const data = localStorage.getItem(key);
        if (data) {
            const reviewState = JSON.parse(data);
            console.log('レビュー状態を読み込みました:', key);
            return reviewState;
        }
    } catch (error) {
        console.error('LocalStorageからの読み込みに失敗しました:', error);
    }

    return null;
}

/**
 * レビュワー名をLocalStorageに保存
 * @param {string} reviewerName - レビュワー名
 */
function saveReviewerName(reviewerName) {
    try {
        localStorage.setItem('reviewerName', reviewerName);
    } catch (error) {
        console.error('レビュワー名の保存に失敗しました:', error);
    }
}

/**
 * レビュワー名をLocalStorageから読み込み
 * @returns {string} レビュワー名
 */
function loadReviewerName() {
    try {
        return localStorage.getItem('reviewerName') || '';
    } catch (error) {
        console.error('レビュワー名の読み込みに失敗しました:', error);
        return '';
    }
}

/**
 * LocalStorageのキーを生成
 * @param {string} folderName - フォルダ名
 * @param {string} fileName - ファイル名
 * @returns {string} キー
 */
function getStorageKey(folderName, fileName) {
    // ファイル名から拡張子を除去
    const baseName = fileName.replace('.json', '');
    return `review_${folderName}_${baseName}`;
}

/**
 * レビュー完了チェック
 * @param {Object} reviews - レビュー結果
 * @param {number} totalQuestions - 全問題数
 * @returns {boolean} 完了しているか
 */
function isReviewComplete(reviews, totalQuestions) {
    const reviewedCount = Object.keys(reviews).length;
    return reviewedCount === totalQuestions;
}

/**
 * レビュー進捗の計算
 * @param {Object} reviews - レビュー結果
 * @param {number} totalQuestions - 全問題数
 * @returns {Object} 進捗情報
 */
function getReviewProgress(reviews, totalQuestions) {
    const reviewedIndices = Object.keys(reviews).map(Number);
    const reviewedCount = reviewedIndices.length;
    const unreviewedCount = totalQuestions - reviewedCount;

    let approvedCount = 0;
    let rejectedCount = 0;

    reviewedIndices.forEach(index => {
        const review = reviews[index];
        if (review.decision === 'approved') {
            approvedCount++;
        } else if (review.decision === 'rejected') {
            rejectedCount++;
        }
    });

    return {
        total: totalQuestions,
        reviewed: reviewedCount,
        unreviewed: unreviewedCount,
        approved: approvedCount,
        rejected: rejectedCount
    };
}

/**
 * フィルタリング
 * @param {Array} questions - 問題配列
 * @param {Object} reviews - レビュー結果
 * @param {string} filterType - フィルタタイプ（all, reviewed, unreviewed）
 * @returns {Array} フィルタリングされた問題インデックス配列
 */
function filterQuestions(questions, reviews, filterType) {
    const indices = [];

    questions.forEach((q, index) => {
        const isReviewed = reviews.hasOwnProperty(index);

        if (filterType === 'all') {
            indices.push(index);
        } else if (filterType === 'reviewed' && isReviewed) {
            indices.push(index);
        } else if (filterType === 'unreviewed' && !isReviewed) {
            indices.push(index);
        }
    });

    return indices;
}

/**
 * 次の未レビュー問題のインデックスを取得
 * @param {number} currentIndex - 現在のインデックス
 * @param {Array} questions - 問題配列
 * @param {Object} reviews - レビュー結果
 * @returns {number} 次の未レビューインデックス（見つからない場合は現在のインデックス+1）
 */
function getNextUnreviewedIndex(currentIndex, questions, reviews) {
    // 現在位置より後ろの未レビュー問題を探す
    for (let i = currentIndex + 1; i < questions.length; i++) {
        if (!reviews.hasOwnProperty(i)) {
            return i;
        }
    }

    // 見つからない場合は、現在位置より前の未レビュー問題を探す
    for (let i = 0; i < currentIndex; i++) {
        if (!reviews.hasOwnProperty(i)) {
            return i;
        }
    }

    // すべてレビュー済みの場合は、次のインデックス（範囲内なら）
    if (currentIndex + 1 < questions.length) {
        return currentIndex + 1;
    }

    return currentIndex;
}

/**
 * LocalStorageの容量チェック
 * @returns {Object} 容量情報
 */
function checkLocalStorageSize() {
    let totalSize = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            totalSize += localStorage[key].length + key.length;
        }
    }

    // バイト単位をKBに変換
    const sizeInKB = (totalSize / 1024).toFixed(2);

    return {
        sizeInKB: sizeInKB,
        itemCount: localStorage.length
    };
}

/**
 * 古いレビュー状態を削除（容量節約用）
 * @param {number} daysOld - 何日前のデータを削除するか
 */
function cleanupOldReviewStates(daysOld = 30) {
    const now = new Date();
    const keysToDelete = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        if (key && key.startsWith('review_')) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                const lastModified = new Date(data.lastModified);
                const daysDiff = (now - lastModified) / (1000 * 60 * 60 * 24);

                if (daysDiff > daysOld) {
                    keysToDelete.push(key);
                }
            } catch (error) {
                // パースエラーの場合は削除対象に
                keysToDelete.push(key);
            }
        }
    }

    keysToDelete.forEach(key => {
        localStorage.removeItem(key);
        console.log('古いレビュー状態を削除しました:', key);
    });

    return keysToDelete.length;
}
