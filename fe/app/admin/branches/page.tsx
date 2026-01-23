'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { branchService } from '@/lib/api/branch-service';
import { Branch } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import Input from '@/components/ui/Input';

export default function BranchesPage() {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
        message: '',
        type: 'success',
        isVisible: false,
    });

    useEffect(() => {
        loadBranches();
    }, []);

    const loadBranches = async () => {
        try {
            setIsLoading(true);
            const data = await branchService.getBranches();
            setBranches(data);
        } catch (error) {
            console.error('Failed to load branches:', error);
            setToast({
                message: 'Failed to load branches',
                type: 'error',
                isVisible: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await branchService.deleteBranch(id);
            setBranches(branches.filter(branch => branch.id !== id));
            setDeleteConfirm(null);
            setToast({
                message: 'Branch deleted successfully',
                type: 'success',
                isVisible: true,
            });
        } catch (error: any) {
            setToast({
                message: error.response?.data?.message || 'Failed to delete branch',
                type: 'error',
                isVisible: true,
            });
        }
    };

    const handleDownloadQR = (branch: Branch) => {
        if (branch.qrCode) {
            branchService.downloadQRCode(branch.qrCode, branch.name);
        } else {
            setToast({
                message: 'No QR code available for this branch',
                type: 'error',
                isVisible: true,
            });
        }
    };

    const filteredBranches = branches.filter(branch =>
        branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size="lg" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast({ ...toast, isVisible: false })}
            />

            {/* Enhanced Header */}
            <div className="mb-10">
                <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
                    <span className="gradient-text">Branches</span>
                </h1>
                <p className="text-lg text-gray-400">Manage cafe locations and QR codes</p>
            </div>

            {/* Search and Add */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex-1">
                    <Input
                        type="text"
                        placeholder="🔍 Search branches..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                    />
                </div>
                <Link href="/admin/branches/new">
                    <Button>
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Add Branch
                    </Button>
                </Link>
            </div>

            {/* Branch Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredBranches.map((branch, index) => (
                    <Card key={branch.id} variant="glass" hover className="stagger-item overflow-hidden">
                        <CardContent className="p-0">
                            {/* Branch Header with Gradient Background */}
                            <div className="relative p-6 pb-4 bg-gradient-to-br from-purple-600/10 via-transparent to-indigo-600/10">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">{branch.name}</h3>
                                        <p className="text-gray-300 text-sm flex items-center gap-1.5">
                                            <LocationIcon className="h-4 w-4 text-purple-400" />
                                            <span>{branch.location}</span>
                                        </p>
                                    </div>
                                    <Badge variant={branch.tokenSystemEnabled ? 'success' : 'default'} size="sm">
                                        {branch.tokenSystemEnabled ? '🎫 Token' : '📋 Standard'}
                                    </Badge>
                                </div>

                                {branch.tokenSystemEnabled && (
                                    <div className="mt-4 text-xs bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 p-3 rounded-xl backdrop-blur-sm">
                                        <div className="flex items-center justify-between text-emerald-300">
                                            <span className="font-medium">Token Range:</span>
                                            <span className="font-bold text-emerald-200">{branch.tokenRangeStart} - {branch.tokenRangeEnd}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* QR Section with Enhanced Styling */}
                            <div className="relative bg-gradient-to-br from-white/5 to-white/[0.02] p-6 flex flex-col items-center justify-center border-y border-white/10">
                                {branch.qrCode ? (
                                    <div className="relative group">
                                        <div className="w-36 h-36 bg-white p-3 rounded-2xl shadow-2xl transform transition-all duration-300 group-hover:scale-105 group-hover:shadow-purple-500/20">
                                            <img
                                                src={branch.qrCode}
                                                alt={`${branch.name} QR Code`}
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl backdrop-blur-sm">
                                            <Button
                                                size="sm"
                                                onClick={() => handleDownloadQR(branch)}
                                                className="bg-white text-purple-900 hover:bg-gray-100 shadow-xl"
                                            >
                                                <DownloadIcon className="h-4 w-4 mr-2" />
                                                Download
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-36 h-36 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-2 border-dashed border-gray-700 rounded-2xl flex items-center justify-center text-gray-500 text-xs text-center p-4 backdrop-blur-sm">
                                        <div>
                                            <div className="text-3xl mb-2">📱</div>
                                            <div className="font-medium">No QR Code</div>
                                            <div className="text-[10px] text-gray-600 mt-1">Generated</div>
                                        </div>
                                    </div>
                                )}
                                <p className="text-xs text-gray-500 mt-4 font-medium">Scan to view menu</p>
                            </div>

                            {/* Actions */}
                            <div className="p-5 flex gap-3 bg-white/[0.02]">
                                <Link href={`/admin/branches/${branch.id}`} className="flex-1">
                                    <Button variant="outline" size="sm" fullWidth>
                                        <EditIcon className="h-4 w-4 mr-2" />
                                        Edit
                                    </Button>
                                </Link>
                                <Button
                                    variant="danger"
                                    size="sm"
                                    onClick={() => setDeleteConfirm(branch.id)}
                                    className="px-4"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {filteredBranches.length === 0 && (
                <Card variant="glass" className="animate-scale-in">
                    <CardContent className="py-16 text-center">
                        <div className="text-6xl mb-4">🏪</div>
                        <p className="text-xl text-gray-300 mb-2 font-semibold">No branches found</p>
                        <p className="text-gray-500 mb-6">Get started by adding your first branch location</p>
                        <Link href="/admin/branches/new">
                            <Button>
                                <PlusIcon className="h-5 w-5 mr-2" />
                                Add First Branch
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteConfirm !== null}
                onClose={() => setDeleteConfirm(null)}
                title="Delete Branch"
            >
                <p className="text-gray-300 mb-6 leading-relaxed">
                    Are you sure you want to delete this branch? All associated employees, menu items, and orders data may be affected.
                </p>
                <div className="flex gap-3 justify-end">
                    <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                    >
                        Delete Branch
                    </Button>
                </div>
            </Modal>
        </div>
    );
}

function PlusIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
    );
}

function LocationIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function DownloadIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );
}

function EditIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
    );
}

