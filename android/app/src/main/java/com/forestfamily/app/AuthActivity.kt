package com.forestfamily.app

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

/**
 * 简化的认证界面（不依赖 Clerk SDK）
 */
class AuthActivity : AppCompatActivity() {

    private lateinit var titleText: TextView
    private lateinit var subtitleText: TextView
    private lateinit var signInButton: Button
    private lateinit var signUpButton: Button
    private lateinit var progressBar: ProgressBar
    private lateinit var contentLayout: LinearLayout

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setupUI()
    }

    private fun setupUI() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setPadding(40, 40, 40, 40)
            setBackgroundColor(ContextCompat.getColor(context, android.R.color.white))
        }

        // Title
        titleText = TextView(this).apply {
            text = "愿望卡"
            textSize = 32f
            setTextColor(ContextCompat.getColor(context, R.color.primary))
            gravity = android.view.Gravity.CENTER
            setPadding(0, 0, 0, 8)
        }
        layout.addView(titleText)

        // Subtitle
        subtitleText = TextView(this).apply {
            text = "家庭任务与奖励管理"
            textSize = 16f
            setTextColor(ContextCompat.getColor(context, R.color.on_surface_variant))
            gravity = android.view.Gravity.CENTER
            setPadding(0, 0, 0, 60)
        }
        layout.addView(subtitleText)

        // Content layout
        contentLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
        }

        // Offline mode info
        val offlineText = TextView(this).apply {
            text = "离线模式 - 应用可正常使用\n（登录功能暂时禁用）"
            textSize = 14f
            setTextColor(ContextCompat.getColor(context, android.R.color.darker_gray))
            gravity = android.view.Gravity.CENTER
            setPadding(0, 0, 0, 40)
        }
        contentLayout.addView(offlineText)

        // Continue Button
        signInButton = Button(this).apply {
            text = "开始使用"
            textSize = 17f
            setBackgroundColor(ContextCompat.getColor(context, R.color.primary))
            setTextColor(ContextCompat.getColor(context, android.R.color.white))
            setOnClickListener { handleContinue() }
        }
        val signInParams = LinearLayout.LayoutParams(280.dpToPx(), 56.dpToPx())
        contentLayout.addView(signInButton, signInParams)

        layout.addView(contentLayout)

        setContentView(layout)
    }

    private fun handleContinue() {
        // 直接完成，使用离线用户ID
        finishWithResult("offline_user_${System.currentTimeMillis()}")
    }

    private fun showError(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }

    private fun finishWithResult(userId: String?) {
        val resultIntent = intent.putExtra("userId", userId)
        setResult(RESULT_OK, resultIntent)
        finish()
    }

    private fun Int.dpToPx(): Int {
        return (this * resources.displayMetrics.density).toInt()
    }
}
