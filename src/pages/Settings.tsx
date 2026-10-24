import { useState } from 'react'
import { Check, X, Trash2, Plus, Pencil } from 'lucide-react'
import clsx from 'clsx'
import PageHeader from '../components/PageHeader'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { useAccountStore } from '../store/useAccountStore'
import { AccountKind, NewAccountInput } from '../lib/types'
import { formatCurrency } from '../lib/format'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'KHR']

const emptyNewAccount: NewAccountInput = {
  name: '',
  kind: 'fund',
  currency: 'USD',
  startingCapital: 10000,
  riskPerTradePercent: 1,
}

export default function Settings() {
  const accounts = useAccountStore((s) => s.accounts)
  const currentAccount = useAccountStore((s) => s.currentAccount)
  const currentAccountId = useAccountStore((s) => s.currentAccountId)
  const setCurrentAccount = useAccountStore((s) => s.setCurrentAccount)
  const addAccount = useAccountStore((s) => s.addAccount)
  const updateAccount = useAccountStore((s) => s.updateAccount)
  const deleteAccount = useAccountStore((s) => s.deleteAccount)
  const { toast, show } = useToast()

  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const [newAccount, setNewAccount] = useState<NewAccountInput>(emptyNewAccount)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)

  const editingAccount = accounts.find((a) => a.id === editingAccountId) ?? currentAccount

  async function patchAccount(id: string, patch: Partial<NewAccountInput>) {
    const errorMessage = await updateAccount(id, patch)
    if (errorMessage) show(errorMessage, true)
  }

  async function handleAddAccount() {
    if (!newAccount.name.trim()) {
      show('Account name is required', true)
      return
    }
    const errorMessage = await addAccount(newAccount)
    if (errorMessage) {
      show(errorMessage, true)
      return
    }
    setNewAccount(emptyNewAccount)
    show('Account added')
  }

  async function handleDeleteAccount(id: string) {
    const errorMessage = await deleteAccount(id)
    setConfirmingDeleteId(null)
    if (errorMessage) show(errorMessage, true)
  }

  const inputClass =
    'w-full max-w-xs rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-emerald-500'
  const labelClass = 'mb-1 block text-xs font-medium text-gray-400'

  return (
    <div>
      <PageHeader title="Settings" description="Configure your trading accounts and defaults." />

      <Toast toast={toast} />

      <div className="max-w-5xl animate-fade-in-up grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4 surface p-5">
          <h2 className="section-title">Accounts</h2>

          <div className="space-y-2">
            {accounts.map((a) => (
              <div
                key={a.id}
                className={clsx(
                  'flex items-center justify-between gap-2 rounded-lg border px-3 py-2 transition-colors',
                  a.id === currentAccountId
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : a.id === editingAccount.id
                      ? 'border-gray-600'
                      : 'border-white/10 hover:border-white/20',
                )}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <input
                      className="min-w-0 flex-1 truncate bg-transparent text-sm font-medium text-gray-100 outline-none focus:underline"
                      value={a.name}
                      onChange={(e) => patchAccount(a.id, { name: e.target.value })}
                    />
                    <span
                      className={clsx(
                        'shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        a.kind === 'cent'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-emerald-500/10 text-emerald-400',
                      )}
                    >
                      {a.kind}
                    </span>
                  </div>
                  <span className="truncate text-xs text-gray-500">
                    {a.currency} · {formatCurrency(a.startingCapital, a.currency)} start
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  {confirmingDeleteId === a.id ? (
                    <>
                      <button
                        onClick={() => handleDeleteAccount(a.id)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-loss hover:bg-gray-800 active:scale-95"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-gray-400 hover:bg-gray-800 active:scale-95"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {a.id === currentAccountId ? (
                        <span className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-400">
                          <Check className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <button
                          onClick={() => setCurrentAccount(a.id)}
                          className="rounded-lg px-2 py-1 text-xs font-medium text-gray-400 hover:bg-gray-800 hover:text-gray-100 active:scale-95"
                        >
                          Switch
                        </button>
                      )}
                      <button
                        onClick={() => setEditingAccountId(a.id)}
                        className={clsx(
                          'rounded-lg p-1.5 hover:bg-gray-800 active:scale-95',
                          a.id === editingAccount.id
                            ? 'text-gray-100'
                            : 'text-gray-400 hover:text-gray-100',
                        )}
                        aria-label="Edit account"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {accounts.length > 1 && (
                        <button
                          onClick={() => setConfirmingDeleteId(a.id)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800 hover:text-loss active:scale-95"
                          aria-label="Delete account"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 border-t border-white/10 pt-5">
            <div>
              <p className="text-sm font-medium text-gray-200">Add account</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Each account keeps its own trades, balance, and stats.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className={labelClass}>Name</label>
                <input
                  className={clsx(inputClass, 'max-w-none')}
                  placeholder="e.g. FTMO Challenge"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount((s) => ({ ...s, name: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                />
              </div>
              <div>
                <label className={labelClass}>Type</label>
                <select
                  className={clsx(inputClass, 'max-w-none')}
                  value={newAccount.kind}
                  onChange={(e) => setNewAccount((s) => ({ ...s, kind: e.target.value as AccountKind }))}
                >
                  <option value="fund">Fund</option>
                  <option value="cent">Cent</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Currency</label>
                <select
                  className={clsx(inputClass, 'max-w-none')}
                  value={newAccount.currency}
                  onChange={(e) => setNewAccount((s) => ({ ...s, currency: e.target.value }))}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Starting Capital</label>
                <input
                  className={clsx(inputClass, 'max-w-none')}
                  type="number"
                  step="any"
                  value={newAccount.startingCapital}
                  onChange={(e) =>
                    setNewAccount((s) => ({ ...s, startingCapital: Number(e.target.value) || 0 }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAccount()}
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAddAccount}
                disabled={!newAccount.name.trim()}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-transform hover:bg-emerald-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
              >
                <Plus className="h-4 w-4" />
                Add Account
              </button>
              {!newAccount.name.trim() && (
                <span className="text-xs text-gray-500">Enter a name to enable</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 surface p-5 lg:sticky lg:top-5">
          <div>
            <h2 className="section-title">
              Editing <span className="text-emerald-400">{editingAccount.name}</span>
            </h2>
            {editingAccount.id !== currentAccountId && (
              <p className="mt-1 text-xs text-gray-500">
                This isn't your active account — changes here won't affect what's currently
                showing elsewhere in the app until you switch to it.
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Type</label>
            <select
              className={inputClass}
              value={editingAccount.kind}
              onChange={(e) => patchAccount(editingAccount.id, { kind: e.target.value as AccountKind })}
            >
              <option value="fund">Fund</option>
              <option value="cent">Cent</option>
            </select>
          </div>

          <div>
            <label className={labelClass}>Currency</label>
            <select
              className={inputClass}
              value={editingAccount.currency}
              onChange={(e) => patchAccount(editingAccount.id, { currency: e.target.value })}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass}>Starting Capital</label>
            <input
              className={inputClass}
              type="number"
              step="any"
              value={editingAccount.startingCapital}
              onChange={(e) =>
                patchAccount(editingAccount.id, { startingCapital: Number(e.target.value) || 0 })
              }
            />
            <p className="mt-1 text-xs text-gray-500">
              Used as the baseline for this account's portfolio value and equity curve.
            </p>
          </div>

          <div>
            <label className={labelClass}>Risk per Trade (%)</label>
            <input
              className={inputClass}
              type="number"
              step="any"
              min={0}
              max={100}
              value={editingAccount.riskPerTradePercent}
              onChange={(e) =>
                patchAccount(editingAccount.id, { riskPerTradePercent: Number(e.target.value) || 0 })
              }
            />
            <p className="mt-1 text-xs text-gray-500">
              Default risk percentage used by the position size calculator.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
